'use strict'

require('yang-js')

module.exports = require('./kinetic-websocket.yang').bind({
  // Bind Reactions
  connect, listen
})

function connect(remote) {
  const WebSocket = this.use('ws:socket')
  let { uri, socket, port, hostname, query } = remote
  let { retry, max } = query
  if (!socket) {
    this.info(`connecting to ${uri}`);
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
      if (typeof retry !== 'number') retry = 100
      //console.log(remote[Symbol.for('property')].in('query').set({ retry: true }))
      this.info(`reconnecting to ${uri} in ${retry}ms...`, remote.query)
      this.after(retry, max)
        .then(retry => {
          remote = Object.assign({}, remote, { uri: undefined, query: { retry } })
          this.info(`reconnecting to ${uri} after ${retry}ms...`, retry)
          this.feed('ws:remote', remote)
        })
    })
    socket.on('error', this.error.bind(this))
  }
}

function listen(local) {
  const Server = this.use('ws:server')
  let { server, uri, protocol, hostname, port, pathname } = local
  if (server) {
    this.info(`listening on existing server instance`)
    server = new Server({ server })
  } else {
    this.info(`listening on ${uri} with ${hostname}:${port}/${pathname}`)
    server = new Server({ hostname, port, pathname })
  }
  server.on('connection', socket => {
    let sock = socket._ws._socket
    let uri = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info(`accept connection from: ${uri}`)
    this.send('net:connection', { uri, socket, server: local.uri })
  })
  server.on('error', this.error.bind(this))
  this.send('ws:server', server)
}
