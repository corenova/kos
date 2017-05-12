// Network transaction flow
//
// NOTE: this flow REQUIREs the 'net' and 'url' modules and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

'use strict'

const { kos = require('..') } = global

module.exports = kos.create('net')
  .desc("reactions to establish TCP/UDP client/server communication links")
  .init('protocols', ['tcp:', 'udp:'])
  .init('links', new Map)

  .in('net/connect').and.has('module/net')
  .out('net/socket','link','net/connect')
  .bind(connect)

  .in('net/listen').and.has('module/net')
  .out('net/server','net/socket','link')
  .bind(listen)

  .in('net/connect/url').and.has('module/url')
  .out('net/connect')
  .bind(connectByUrl)

  .in('net/listen/url').and.has('module/url')
  .out('net/listen')
  .bind(listenByUrl)


function connect(opts) {
  const [ net, protocols, links ] = this.get('module/net', 'protocols', 'links')

  let { protocol, hostname, port, retry, max } = normalizeOptions.call(this, opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  const addr = `${protocol}//${hostname}:${port}`
  if (links.has(addr)) return this.send('link', links.get(addr))

  const sock = new net.Socket
  const link = { addr: addr, socket: sock }

  links.set(addr, link)
  this.send('link', link)

  sock.setNoDelay()
  sock.on('connect', () => {
    this.info("connected to", addr)
    this.send('net/socket', sock)
    sock.emit('active')
    if (retry) retry = 100
  })
  sock.on('close', () => {
    if (sock.closing) return
    retry && setTimeout(() => {
      opts = Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      })
      this.debug("attempt reconnect", addr)
      links.delete(addr)
      // NOTE: we use send with id=null since KOs that can trigger
      // itself are automatically filtered to prevent infinite loops
      this.send('net/connect', opts, null)
    }, retry)
  })
  sock.on('error', this.error.bind(this))

  this.debug("attempt", addr)
  sock.connect(port, hostname)
}

function listen(opts) {
  const net = this.get('module/net')
  let { protocol, hostname, port, retry, max } = normalizeOptions(opts)

  let server = net.createServer(sock => {
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info('accept', addr)
    this.send('net/socket', sock)
    this.send('link', { addr: addr, socket: sock, server: server })
    sock.emit('active')
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
    max:      parseInt(opts.max, 10) || 5000
  }
}

