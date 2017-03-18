// Link transaction flow
//
// NOTE: this flow REQUIREs the 'url' modules and will become active
// if already present locally, receives it from the upstream, or fed
// by the user directly.

'use strict'

const kos = require('..')

module.exports = kos.create('kos-link')
  .summary("Provides dynamic client/server communication flows for various protocols")
  .require('module/url')
  .default('streams', new Map)

  .import(kos.load('net')) // supports kos, tcp, unix protocols
  .import(kos.load('ws'))  // supports ws, wss protocols

  .in('link/connect').out('net/connect','ws/connect').bind(connect)
  .in('link/listen').out('net/listen','ws/listen').bind(listen)

  .in('link/connect/url').out('link/connect').bind(connectByUrl)
  .in('link/listen/url').out('link/listen').bind(listenByUrl)

  .in('net/link').out('link/stream').bind(createNetStream)
  .in('ws/link').out('link/stream').bind(createWebSocketStream)


function connect(opts) {
  switch (opts.protocol) {
  case 'ws:':
  case 'wss:':
    this.send('ws/connect', opts)
    break;
  case 'tcp:':
  case 'udp:':
  case undefined:
    this.send('net/connect', opts)
    break;
  default:
    this.warn('unsupported protocol', opts.protocol)
  }
}

function listen(opts) {
  switch (opts.protocol) {
  case 'ws:':
  case 'wss:':
    this.send('ws/listen', opts)
    break;
  case 'tcp:':
  case 'udp:':
  case undefined:
    this.send('net/listen', opts)
    break;
  default:
    this.warn('unsupported protocol', opts.protocol)
  }
}

function connectByUrl(dest) {
  const url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'tcp://' + dest
  let opts = url.parse(dest, true)
  this.debug(opts)
  this.send('link/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  const url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'tcp://' + dest
  let opts = url.parse(dest, true)
  this.send('link/listen', Object.assign(opts, opts.query))
}

function createNetStream(link) {
  let { addr, socket } = link
  let streams = this.fetch('streams')
  let stream = streams.has(addr) ? streams.get(addr) : new kos.Essence

  socket.on('active', () => {
    let io = stream.io()
    socket.pipe(io, { end: false }).pipe(socket)
    socket.on('close', () => {
      io.unpipe(socket)
      socket.destroy()
    })
  })
  if (!streams.has(addr)) {
    stream.on('ready', () => this.debug("ready now!"))
    streams.set(addr, stream)
    this.send('link/stream', stream)
  }
}

function createWebSocketStream(link) {
  let { addr, socket } = link
  let streams = this.fetch('streams')
  let stream = streams.has(addr) ? streams.get(addr) : new kos.Essence

  socket.on('active', () => {
    // TODO: for now KSON text based exchange. should explore binary encoding
    let io = stream.io()
    socket.on('message', io.write.bind(io))
    io.on('data', socket.send.bind(socket))
    socket.on('close', io.unpipe.bind(io,socket))
  })

  if (!streams.has(addr)) {
    stream.on('ready', () => this.debug("ready now!"))
    streams.set(addr, stream)
    this.send('link/stream', stream)
  }
}

