// WebSocket transaction flow
//
// NOTE: this flow REQUIREs the 'ws' and 'url' module and will become
// active if already present locally, receives it from the upstream,
// or fed by the user directly.

'use strict'

const { kos = require('..') } = global

module.exports = kos.create('ws')
  .desc("reactions to establish WebSocket client/server communication links")
  .init('protocols', ['ws:', 'wss:'])
  .init('links', new Map)

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
  const links = this.get('links')

  let { protocol, hostname, port, path, retry, max } = opts = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  const addr = `${protocol}//${hostname}:${port}/${path}`
  if (links.has(addr)) return this.send('link', links.get(addr))

  const socket = new WebSocket(addr)
  const link = { addr, socket, opts }

  links.set(addr, link)
  this.send('link', link)

  socket.on('connect', () => {
    this.info("connected to", addr)
    this.send('ws/socket', socket)
    socket.emit('active')
    if (retry) retry = 100
  })
  socket.on('close', () => {
    // find out if explicitly being closed?
    retry && setTimeout(() => {
      opts = Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      })
      this.debug("attempt reconnect", addr)
      links.delete(addr)
      this.feed('ws/connect', opts)
    }, retry)
  })
  socket.on('error', this.error.bind(this))
}

function listen(opts) {
  const Server = this.get('module/simple-websocket/server')
  const protocols = this.get('protocols')

  let { protocol, hostname, port, path, server } = opts = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  this.debug('attempt', hostname, port)
  if (server) {
    server = new Server({ server })
    this.info('listening on existing server instance')
    this.send('ws/server', server)
  } else {
    server = new Server({ host: hostname, port: port, path: path })
    this.info('listening', hostname, port, path)
    this.send('ws/server', server)
  }
  server.on('connection', socket => {
    let sock = socket._ws._socket
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info('accept', addr)
    this.send('ws/socket', socket)
    this.send('link', { addr, socket, server, opts })
    socket.emit('active')
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
    max:      parseInt(opts.max, 10) || 5000,
    persist:  ("persist" in opts)
  }
}

