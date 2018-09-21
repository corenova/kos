'use strict'

require('yang-js')

module.exports = require('./kinetic-websocket.yang').bind({
  'feature(ws:socket)': () => require('simple-websocket'),
  'feature(ws:server)': () => require('simple-websocket/server'),

  // Bind Reactions
  connect, listen
})

function connect(remote) {
  const WebSocket = this.use('ws:socket')
  const connections = this.use('connections', new Map)
  let { uri, socket, port, hostname, query } = remote
  let { retry, max } = query
  if (!socket) {
    socket = new WebSocket(uri)
    socket.on('connect', () => {
      this.info(`connected to ${uri}...`)
      this.send('net:connection', { uri, socket })
      if (retry) retry = 100
    })
    socket.on('close', () => {
      if (socket.closing || !retry) {
        return this.info(`disconnected from ${uri}`)
      }
      this.after(retry, max)
        .then(retry => {
          this.info(`reconnecting to ${uri}...`)
          remote = Object.assign({}, remote, { query: { retry } })
          this.feed('ws:remote', remote)
        })
    })
    socket.on('error', this.error.bind(this))
  }
}

function listen(local) {
  const Server = this.use('ws:server')
  let { server, uri, protocol, hostname: host, port, path } = local
  if (server) {
    server = new Server({ server })
    this.info('using existing server instance')
    this.send('ws:server', server)
  } else {
    server = new Server({ host, port, path })
    this.info(`listening on ${uri}`)
    this.send('ws:server', server)
  }
  server.on('connection', socket => {
    let sock = socket._ws._socket
    let uri = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info(`accept connection from: ${uri}`)
    this.send('net:connection', { uri, socket, server: local.uri })
  })
  server.on('error', this.error.bind(this))
}
