// Network transaction flow
//
// NOTE: this flow REQUIREs the 'net' and 'url' modules and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

'use strict'

const kos = require('..')

module.exports = kos.create('kos-net')
  .summary("Provides network client/server communication flows")
  .require('module/net','module/url')
  .default('protocols', ['tcp:', 'udp:'])

  .in('net/connect').out('net/socket','net/link').bind(connect)
  .in('net/listen').out('net/server','net/socket','net/link').bind(listen)

  .in('net/connect/url').out('net/connect').bind(connectByUrl)
  .in('net/listen/url').out('net/listen').bind(listenByUrl)

function connect(opts) {
  const [ net, protocols ] = this.fetch('module/net', 'protocols')

  let { protocol, hostname, port, retry, max } = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  let addr = `${protocol}//${hostname}:${port}`
  let sock = new net.Socket

  this.send('net/link', { addr: addr, socket: sock })

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
      this.debug("attempt reconnect", addr)
      // NOTE: we don't use this.send here because self-generated
      // KOs that can trigger itself are filtered to prevent
      // infinite loops
      this.feed('net/connect', Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      }))
    }, retry)
  })
  sock.on('error', this.error.bind(this))

  this.debug("attempt", addr)
  sock.connect(port, hostname)
}

function listen(opts) {
  let net = this.fetch('module/net')
  let { protocol, port, host, retry, max } = normalizeOptions(opts)

  let server = net.createServer(sock => {
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info("accept", addr)
    this.send('net/socket', sock)
    this.send('net/link', {
      addr: addr,
      socket: sock
    })
    sock.emit('active')
  })
  server.on('listening', () => {
    this.info('listening', host, port)
    this.send('net/server', server)
  })
  server.on('error', this.throw.bind(this))
  this.debug("attempt", host, port)
  server.listen(port, host)
}

function connectByUrl(dest) {
  let url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'tcp://' + dest
  let opts = url.parse(dest, true)
  this.send('net/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'tcp://' + dest
  let opts = url.parse(dest, true)
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

