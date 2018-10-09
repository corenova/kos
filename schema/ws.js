'use strict'

require('yang-js')

module.exports = require('./ws.yang').bind({
  // Bind Reactions
  connect(remote) {
    const WebSocket = this.use('ws:socket')
    let { uri, socket, hostname, port, path, query } = remote
    let { retry, max } = query

    //if (connections.has(addr)) return this.send('kos:connection', connections.get(addr))
    if (!socket) {
      socket = new WebSocket(uri)
      socket.on('connect', () => {
        this.info("connected to", uri)
        this.send('net:connection', { uri, socket })
        socket.emit('active')
        if (retry) retry = 100
      })
      socket.on('close', () => {
        // find out if explicitly being closed?
        if (!retry) return
        this.defer(retry, max)
          .then( timeout => {
            remote = Object.assign({}, remote, { retry: timeout })
            this.log("attempt reconnect", uri)
            // should delete related 'connection'
            this.send('ws:remote', remote)
          })
      })
      socket.on('error', this.error.bind(this))
    }
  },
  listen(local) {
    const Server = this.use('simple-websocket-server')
    let { protocol, hostname, port, path, server } = opts

    this.debug('attempt', hostname, port)
    if (server) {
      server = new Server({ server })
      this.info('listening on existing server instance')
      this.send('ws:server', server)
    } else {
      server = new Server({ host: hostname, port: port, path: path })
      this.info('listening', hostname, port, path)
      this.send('ws:server', server)
    }
    server.on('connection', socket => {
      let sock = socket._ws._socket
      let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
      this.info('accept', addr)
      this.send('ws:socket', socket)
      this.send('kow:connection', { addr, socket, server, opts })
      socket.emit('active')
    })
    server.on('error', this.error.bind(this))
  }
})
