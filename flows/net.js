'use strict'

const kos = require('..')

module.exports = kos.create('kos-net')
  .require('module/net')
  .require('module/url')

  .in('net/connect').out('net/socket','net/link').bind(connect)
  .in('net/listen').out('net/server','net/socket','net/link').bind(listen)

  .in('net/connect/url').out('net/connect').bind(connectByUrl)
  .in('net/listen/url').out('net/listen').bind(listenByUrl)

  .in('net/link').out('net/stream')
  .default('streams', new Map)
  .bind(createStream)

function connect(opts) {
  let net = this.fetch('module/net')
  let { protocol, port, host, encoding, retry, max } = normalizeOptions(opts)

  let addr = host + ':' + port
  let sock = new net.Socket
  sock.setNoDelay()
  sock.on('connect', () => {
    this.info("connected to", addr)
    this.send('net/socket', sock)
    this.send('net/link', { 
      addr: addr,
      socket: sock, 
      encoding: encoding
    })
  })
  sock.on('close', () => {
    if (sock.closing) return
    if (retry) {
      setTimeout(() => {
        this.debug("attempt reconnect", addr)
        // NOTE: we don't use this.send here because self-generated
        // KOs that can trigger itself are filtered to prevent
        // infinite loops
        this.feed('net/connect', Object.assign({}, opts, {
          retry: Math.round(Math.min(max, retry * 1.5))
        }))
      }, retry)
    }
  })
  this.debug("attempt", addr)
  // TODO: support protocols
  sock.connect(port, host)
}

function listen(opts) {
  let net = this.fetch('module/net')
  let { protocol, port, host, encoding, retry, max } = normalizeOptions(opts)

  let server = net.createServer(sock => {
    let addr = sock.remoteAddress + ':' + sock.remotePort
    this.debug("accept", addr)
    this.send('net/socket', sock)
    this.send('net/link', {
      addr: addr,
      socket: sock,
      encoding: encoding
    })
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
  let opts = url.parse(url.resolve('kos://', dest), true)
  this.send('net/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.fetch('module/url')
  let opts = url.parse(url.resolve('kos://', dest), true)
  this.send('net/listen', Object.assign(opts, opts.query))
}

function createStream(link) {
  let { addr, socket } = link
  let streams = this.get('streams')
  let stream = streams.has(addr) ? streams.get(addr) : kos.create('link/' + addr)
  let io = stream.io()
  socket.on('error', this.throw.bind(this))
  socket.on('close', () => {
    io.unpipe(socket)
    socket.destroy()
  })
  socket.pipe(io).pipe(socket)
  if (!streams.has(addr)) {
    streams.set(addr, stream)
    this.send('net/stream', stream)
  }
}

function normalizeOptions(opts) {
  return {
    protocol: opts.protocol || 'kos',
    port:     parseInt(opts.port, 10) || 12345,
    host:     opts.host || '0.0.0.0',
    encoding: opts.encoding || 'json',
    retry:    parseInt(opts.retry, 10) || 100,
    max:      parseInt(opts.max, 10) || 5000
  }
}

