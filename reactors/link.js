// Link transaction flow
//
// NOTE: this flow REQUIREs the 'url' module and will become active
// if already present locally, receives it from the upstream, or fed
// by the user directly.

'use strict'

const { kos = require('..') } = global
const net = require('./net')
const ws  = require('./ws')

module.exports = kos.create('link')
  .desc('reactions to stream dynamic client/server links')
  .load(net, ws)
  .init('streams', new Map)

  .in('link/connect').out('net/connect','ws/connect').bind(connect)
  .in('link/listen').out('net/listen','ws/listen').bind(listen)

  .in('link/connect/url').and.has('module/url')
  .out('link/connect').bind(connectByUrl)

  .in('link/listen/url').and.has('module/url')
  .out('link/listen').bind(listenByUrl)

  .in('link').out('link/stream').bind(createLinkStream)


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
  const url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('tcp://'+dest, true)
  this.send('link/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  const url = this.get('module/url')
  let opts = url.parse(dest, true)
  if (!opts.slashes) opts = url.parse('tcp://'+dest, true)
  this.send('link/listen', Object.assign(opts, opts.query))
}

function createLinkStream(link) {
  const { addr, socket, server } = link
  const streams = this.get('streams')
  const stream = 
    streams.has(addr) ? 
    streams.get(addr) : 
    (new kos.Stream).init(link)

  socket.on('active', () => {
    let io = stream.io()
    socket.pipe(io).pipe(socket)
    socket.on('close', () => {
      socket.destroy()
      if (server) {
        stream.emit('destroy')
        stream.end()
        streams.delete(addr)
      } else {
        stream.emit('inactive')
      }
    })
    stream.resume()
    stream.emit('active', socket)
  })
  if (!streams.has(addr)) {
    streams.set(addr, stream)
    stream.once('active', () => this.send('link/stream', stream))
  }
}
