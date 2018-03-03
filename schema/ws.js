'use strict'

require('yang-js')

module.exports = require('./ws.yang').bind({
  connector: {
    connect(opts) {
      const WebSocket = this.use('simple-websocket')
      const connections = this.get('connections')
      let { protocol, hostname, port, path, retry, max } = opts

      const addr = `${protocol}//${hostname}:${port}/${path}`
      if (connections.has(addr)) return this.send('kos:connection', connections.get(addr))

      const socket = new WebSocket(addr)
      const connection = { addr, socket, opts }

      connections.set(addr, connection)
      this.send('kos:connection', connection)

      socket.on('connect', () => {
        this.info("connected to", addr)
        this.send('ws:socket', socket)
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
          connections.delete(addr)
          this.feed('ws:connect', opts)
        }, retry)
      })
      socket.on('error', this.error.bind(this))
    },

    listen(opts) {
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
  }
})
