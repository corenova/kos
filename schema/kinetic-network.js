'use strict'

require('yang-js')

module.exports = require('./kinetic-network.yang').bind({
  'feature(net:net)':    () => require('net'),
  'feature(net:socket)': () => require('net').Socket,
  'feature(net:server)': () => require('net').Server,

  '/net:topology/remote': {
    active() {
      const uri = this.get('../uri')
      return this.in('/net:session/connection').has(uri)
    }
  },
  '/net:topology/local': {
    connections() {
      const uri = this.get('../uri')
      return [].concat(this.get(`/net:session/connection[source = '${uri}']/uri`))
    }
  },

  "grouping(endpoint)": {
    uri(value) {
      const Url = this.use('kos:url')
      if (arguments.length) { // setter
        if (value) {
          let obj = Url.parse(value, true)
          if (!obj.slashes) {
            let proto = this.parent.schema.locate('protocol').default.tag
            obj = Url.parse(`${proto}://${value}`, true)
          }
          for (let k in obj)
            this.container[k] = obj[k]
        }
        return undefined
      } else { // getter
        return Url.format(this.container)
      }
    }
  },

  // Bind Reactions
  connect, request, listen, streamify
})

function connect(remote) {
  const Socket = this.use('net:socket')
  let { uri, socket, port, hostname, query } = remote
  let { retry, max } = query
  // TODO: check if pre-existing connection for the 'uri' exists.
  if (!socket) {
    socket = new Socket
    socket.setNoDelay()
    remote = Object.assign({}, remote, { socket })
    socket.on('connect', () => {
      this.send('net:connection', { uri, socket })
    })
    socket.on('close', () => {
      if (socket.closing || !retry) return
      this.defer(retry, max)
        .then( timeout => {
          remote = Object.assign({}, remote, { retry: timeout })
          this.info("attempt reconnect", uri)
          // should delete related 'connection'
          this.send('net:remote', remote)
        })
    })
    socket.on('error', this.error.bind(this))
  }
  // TODO: preserve this in module configuration state
  //this.in('/net:topology/remote').add(remote)
  this.debug('attempt', uri)
  socket.connect(port, hostname)
}

function request(opts) {
  const net = this.use('net:net');
  let { socket, data } = opts;
  if (!socket || socket.closing) {
    const { uri, hostname, port, query={} } = opts;
    this.debug(`making a new connection to ${uri}...`)
    socket = net.createConnection(port, hostname, () => {
      this.debug(`connected to ${uri} and sending ${data} single ${query.single}`);
      socket.write(data + '\r\n');
      // do we need this here?
      if (query.single) socket.end()
    });
    socket.on('data', (data) => {
      this.send('net:response', { uri, socket, data });
      // or do we need it here?
      if (query.single) socket.end()
    });
    socket.on('end', () => {
      this.debug(`disconnected from ${uri}`);
    })
    socket.on('error', this.error.bind(this))
  } else {
    socket.write(data + '\r\n');
  }
}

function listen(local) {
  const Server = this.use('net:server')
  let { server, protocol, port, hostname, uri } = local
  if (!server) {
    server = new Server
    server.on('connection', socket => {
      const uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
      this.info('accept', uri)
      this.send('net:connection', { uri, socket, server: local.uri })
    })
    server.on('listening', () => {
      this.info('listening', uri)
      this.send('net:server', server)
    })
    server.on('error', this.error.bind(this))
  }
  // TODO: preserve this in module configuration state
  //this.in('/net:topology/local').add(local)
  this.debug(`attempt ${uri}`)
  server.listen(port, hostname)
}

function streamify(connection) {
  const Stream = this.use('kos:stream')
  const { uri, socket, server } = connection
  //this.in('/kos:connection').add(connection)
  let stream = new Stream(uri)
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
