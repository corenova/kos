'use strict'

require('yang-js')

module.exports = require('./kinetic-network.yang').bind({
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
            let proto = this.schema.locate('../protocol').default.tag
            obj = Url.parse(`${proto}://${value}`, true)
          }
          for (let k in obj)
            this.container[k] = obj[k]
        }
        return undefined
      } else { // getter
        return Url.format(this.container)
      }
    },
    protocol(value) {
      if (arguments.length) {
        if (value) {
          value = value.replace(':','')
          this.content = value
        }
      } else {
        return this.content
      }
    }
  },

  // Bind Reactions
  connect, request, listen
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
      if (retry) retry = 100
    })
    socket.on('close', () => {
      if (socket.closing || !retry) return
      this.after(retry, max)
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
    let buffer = ''
    this.debug(`making a new connection to ${uri}...`)
    socket = net.createConnection(port, hostname, () => {
      this.debug(`connected to ${uri} sending request...`);
      socket.write(data + '\r\n');
      socket.end()
    });
    socket.on('data', (data) => {
      this.debug(`received ${data.length} bytes data from ${uri}`);
      buffer += data.toString()
    });
    socket.on('end', () => {
      this.debug(`disconnected from ${uri}, returning ${buffer.length} bytes`);
      this.send('net:response', { uri, socket, data: buffer });
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
      this.info(`accept connection from ${uri}`)
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

