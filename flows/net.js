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
  let { protocol, port, host, retry, max } = normalizeOptions(opts)

  let addr = host + ':' + port
  let sock = new net.Socket
  sock.setNoDelay()
  sock.on('connect', () => {
    this.info("connected to", addr)
    this.send('net/socket', sock)
    sock.emit('active')
    if (retry) retry = 100
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
  this.send('net/link', { 
    addr: addr,
    socket: sock
  })
  // TODO: support protocols
  sock.connect(port, host)
}

function listen(opts) {
  let net = this.fetch('module/net')
  let { protocol, port, host, retry, max } = normalizeOptions(opts)

  let server = net.createServer(sock => {
    let addr = sock.remoteAddress + ':' + sock.remotePort
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
    dest = 'kos://' + dest
  let opts = url.parse(url.resolve('kos://', dest), true)
  this.send('net/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'kos://' + dest
  let opts = url.parse(dest, true)
  this.send('net/listen', Object.assign(opts, opts.query))
}

function createStream(link) {
  let { addr, socket } = link
  let streams = this.get('streams')
  let stream = streams.has(addr) ? streams.get(addr) : new kos.Essence
  socket.on('active', () => {
    let io = stream.io()
    socket.pipe(io, { end: false }).pipe(socket)
    socket.on('close', () => {
      io.unpipe(socket)
      socket.destroy()
    })
  })
  //let io = wrappers.has(stream) ? wrappers.get(stream) : stream.io()
  socket.on('error', this.throw.bind(this))
  if (!streams.has(addr)) {
    stream.on('ready', () => this.debug("ready now!"))
    streams.set(addr, stream)
    this.send('net/stream', stream)
  }
  // if (!wrappers.has(stream)) {
  //   this.debug('saving wrapper for', addr)
  //   wrappers.set(stream, io)
  // }
}

function normalizeOptions(opts) {
  return {
    protocol: opts.protocol || 'kos',
    port:     parseInt(opts.port, 10) || 12345,
    host:     opts.hostname || opts.host || '0.0.0.0',
    retry:    parseInt(opts.retry, 10) || 100,
    max:      parseInt(opts.max, 10) || 5000
  }
}

