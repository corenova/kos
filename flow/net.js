// Network transaction flow observer
//
// NOTE: this flow REQUIREs the 'net' and 'url' modules and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

'use strict'

const { kos = require('..') } = global

module.exports = kos.create('net')
  .desc("reactions to establish TCP/UDP client/server communication links")
  .init({
    protocols: ['tcp:', 'udp:'],
    links: new Map
  })

  .pre('module/net')
  .in('net/connect')
  .out('net/socket','link','net/connect')
  .bind(connect)

  .pre('module/net')
  .in('net/listen')
  .out('net/server','net/socket','link')
  .bind(listen)

  .pre('module/url')
  .in('net/connect/url')
  .out('net/connect')
  .bind(connectByUrl)

  .pre('module/url')
  .in('net/listen/url')
  .out('net/listen')
  .bind(listenByUrl)


function connect(opts) {
  const [ net, protocols, links ] = this.get('module/net', 'protocols', 'links')

  // TODO: should be handled via data model schema
  let { protocol, hostname, port, retry, max } = opts = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  const addr = `${protocol}//${hostname}:${port}`
  if (links.has(addr)) return this.send('link', links.get(addr))

  const socket = new net.Socket
  const link = { addr, socket, opts }

  links.set(addr, link)
  this.send('link', link)

  socket.setNoDelay()
  socket.on('connect', () => {
    this.info("connected to", addr)
    this.send('net/socket', socket)
    socket.emit('active')
    if (retry) retry = 100
  })
  socket.on('close', () => {
    if (socket.closing) return
    retry && setTimeout(() => {
      opts = Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      })
      this.debug("attempt reconnect", addr)
      links.delete(addr)
      this.feed('net/connect', opts)
    }, retry)
  })
  socket.on('error', this.error.bind(this))

  this.debug("attempt", addr)
  socket.connect(port, hostname)
}

function listen(opts) {
  const net = this.get('module/net')

  // TODO: should be handled via data model schema
  let { protocol, hostname, port, retry, max } = opts = normalizeOptions(opts)

  let server = net.createServer(socket => {
    let addr = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
    this.info('accept', addr)
    this.send('net/socket', socket)
    this.send('link', { addr, socket, server, opts })
    socket.emit('active')
  })
  server.on('listening', () => {
    this.info('listening', hostname, port)
    this.send('net/server', server)
  })
  server.on('error', this.error.bind(this))
  this.debug('attempt', hostname, port)
  server.listen(port, hostname)
}

function connectByUrl(dest) {
  let url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('tcp://'+dest, true)
  this.send('net/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('tcp://'+dest, true)
  this.send('net/listen', Object.assign(opts, opts.query))
}

function normalizeOptions(opts) {
  return {
    protocol: opts.protocol || 'tcp:',
    hostname: opts.hostname || '0.0.0.0',
    port:     parseInt(opts.port, 10) || 12345,
    retry:    parseInt(opts.retry, 10) || 100,
    max:      parseInt(opts.max, 10) || 5000,
    repair:  ("repair" in opts)
  }
}

