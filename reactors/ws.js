// WebSocket transaction flow
//
// NOTE: this flow REQUIREs the 'ws' and 'url' module and will become
// active if already present locally, receives it from the upstream,
// or fed by the user directly.

'use strict'

const { kos = require('..') } = global

module.exports = kos.reactor('ws')
  .desc("reactions to establish WebSocket client/server communication links")
  .init('protocols', ['ws:', 'wss:'])

  .in('ws/connect').and.has('module/simple-websocket')
  .out('ws/socket','link','ws/connect')
  .bind(connect)

  .in('ws/listen').and.has('module/simple-websocket/server')
  .out('ws/server','ws/socket','link')
  .bind(listen)

  .in('ws/connect/url').and.has('module/url')
  .out('ws/connect')
  .bind(connectByUrl)

  .in('ws/listen/url').and.has('module/url')
  .out('ws/listen')
  .bind(listenByUrl)

function connect(opts) {
  const WebSocket = this.get('module/simple-websocket')
  const protocols = this.get('protocols')

  let { protocol, hostname, port, path, retry, max } = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  let addr = `${protocol}//${hostname}:${port}/${path}`
  let wsock = new WebSocket(addr)
  this.send('link', { addr: addr, socket: wsock })

  wsock.on('connect', () => {
    this.info("connected to", addr)
    this.send('ws/socket', wsock)
    wsock.emit('active')
    if (retry) retry = 100
  })
  wsock.on('close', () => {
    // find out if explicitly being closed?
    retry && setTimeout(() => {
      this.debug("attempt reconnect", addr)
      // NOTE: we use send with id=null since KOs that can trigger
      // itself are automatically filtered to prevent infinite loops
      this.send('ws/connect', Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      }), null)
    }, retry)
  })
  wsock.on('error', this.error.bind(this))
}

function listen(opts) {
  const Server = this.get('module/simple-websocket/server')
  const protocols = this.get('protocols')

  let { protocol, hostname, port, path, server } = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  if (server) {
    server = new Server({ server })
    this.info('listening on existing server instance')
    this.send('ws/server', server)
  } else {
    server = new Server({ host: hostname, port: port, path: path })
    server.on('listening', () => {
      this.info('listening', hostname, port, path)
      this.send('ws/server', server)
    })
  }
  server.on('connection', wsock => {
    let sock = wsock._ws._socket
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info('accept', addr)
    this.send('ws/socket', wsock)
    this.send('link', { addr: addr, socket: wsock })
    wsock.emit('active')
  })
  server.on('error', this.error.bind(this))
}

function connectByUrl(dest) {
  let url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('ws://'+dest, true)
  this.send('ws/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('ws://'+dest, true)
  this.send('ws/listen', Object.assign(opts, opts.query))
}

function normalizeOptions(opts) {
  return {
    protocol: opts.protocol || 'ws:',
    hostname: opts.hostname || '0.0.0.0',
    port:     parseInt(opts.port, 10) || 80,
    path:     opts.path || '',
    server:   opts.server,
    retry:    parseInt(opts.retry, 10) || 100,
    max:      parseInt(opts.max, 10) || 5000
  }
}

