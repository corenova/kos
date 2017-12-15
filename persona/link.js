// Link transaction flow observer
//
// NOTE: this flow REQUIREs the 'url' module and will become active
// if already present locally, receives it from the upstream, or fed
// by the user directly.

'use strict'

const { kos = require('..') } = global
const net  = require('./net')
const ws   = require('./ws')

module.exports = kos.create('link')
  .desc('reactions to stream dynamic client/server links')

  .load(net)
  .load(ws)

  .in('link/connect')
  .out('net/connect','ws/connect','link/connect/url')
  .bind(connect)

  .in('link/listen')
  .out('net/listen','ws/listen','link/listen/url')
  .bind(listen)

  .pre('module/url')
  .in('link/connect/url')
  .out('link/connect')
  .bind(connectByUrl)

  .pre('module/url')
  .in('link/listen/url')
  .out('link/listen')
  .bind(listenByUrl)

  .in('connection').out('link').bind(link)

function connect(opts) {
  if (typeof opts === 'string') return this.send('link/connect/url', opts)

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
  if (typeof opts === 'string') return this.send('link/listen/url', opts)

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

function link(connection) {
  const { addr, socket, server, opts } = connection
  const link = this.use(addr, kos.create('link').desc(addr).init(connection))

  socket.on('active', () => {
    let io = link.io({
      error: false
    })
    socket.pipe(io).pipe(socket)
    socket.on('close', () => {
      socket.destroy()
      if (server) {
        link.leave()
        link.end()
        this.delete(addr)
      } else {
        link.emit('inactive')
      }
    })
    link.resume()
    this.send('link', link)
  })
}
