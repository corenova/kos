'use strict'

require('yang-js')

module.exports = require('./net.yang').bind({

  'grouping(remote)': {
    active() {
      const uri = this.get('../uri')
      return this.in('/net:connection').has(uri)
    },
    socket() {
      const Net = this.use('node:net')
      if (this.content instanceof Net.Socket) return this.content
      const query = this.get('../query') || {}
      let { retry, max } = query
      let socket = new Net.Socket
      socket.setNoDelay()
      // make the socket re-connecting if enabled
      if (retry) {
        socket.on('connect', () => retry = query.retry)
        socket.on('close', () => {
          if (socket.closing || !retry) return
          return // enable reconnect logic later
          this.defer(retry, max)
            .then( timeout => {
              retry = timeout
              this.log("attempt reconnect", uri)
              socket.connect(port, hostname)
            })
        })
        // TODO: get to node version 8
        // socket.on('close', async () => {
        //   if (socket.closing) return
        //   retry = await this.defer(retry, max)
        //   let opts = Object.assign({}, opts, { retry })
        //   this.debug("attempt reconnect", addr)
        //   this.send('link:connect', opts)
        // })
      }
      return this.content = socket
    }
  },
  'grouping(local)': {
    connections() {
      const uri = this.get('../uri')
      return [].concat(this.get(`/net:connection[source = '${uri}']/uri`))
    },
    server() {
      const Net = this.use('node:net')
      if (this.content instanceof Net.Socket) return this.content
      return this.content = new Net.Server
    }
  },
  // Bind Actions
  connect(remote) {
    const { socket, port, hostname, uri, query } = remote
    let { retry, max } = query
    this.in('/net:remote').add(remote)

    return new Promise(resolve => {
      socket.on('connect', () => resolve({ uri, socket }))
      socket.connect(port, hostname)
    })
  },
  listen(local) {
    const { server, port, hostname, uri } = local
    this.in('/net:local').add(local)
    return new Promise(resolve => {
      server.on('listening', () => resolve({ uri, server }))
      server.listen(port, hostname)
    })
  },

  // Bind Reactions
  composeRemote(uri) {
    const Url = this.use('node:url')
    let opts = Url.parse(uri, true)
    if (!opts.slashes) opts = Url.parse('tcp://'+uri, true)
    this.send('net:remote', opts)
  },
  invokeConnect(remote) {
    const { socket, uri, query } = remote
    if (!socket) return
    socket.on('connect', () => {
      this.send('link:connection', { uri, socket })
    })
    socket.on('error', this.error.bind(this))
    this.send('/net:connect', remote)
  },
  invokeListen(local) {
    const { server, uri, protocol } = local
    server.on('connection', socket => {
      const uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
      this.info('accept', uri)
      this.send('link:connection', { uri, socket })
    })
    server.on('listening', () => {
      this.info('listening', uri)
      this.send('net:server', server)
    })
    server.on('error', this.error.bind(this))
    this.debug('attempt', uri)
    this.send('/net:listen', local)
  },
  streamify(connection) {
    const Stream = this.use('kos:stream')
    const { socket, server } = connection
    this.in('/kos:connection').add(connection)
    let stream = new Stream(connection.uri)
    socket.on('active', () => {
      let { io } = stream
      io.link(socket)
      socket.on('close', () => {
        socket.destroy()
        if (server) {
          //link.leave()
          stream.end()
          //this.delete(uri)
        } else {
          io.unlink(socket)
          stream.emit('inactive', io)
        }
      })
      stream.resume()
      this.send('kos:stream', stream)
    })
  }
})
