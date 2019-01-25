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
      const Url = this.use('kos:url');
      if (arguments.length) { // setter
        if (value) {
          let obj = Url.parse(value, true);
          if (!obj.slashes) {
            let proto = this.locate('../protocol').default.tag;
            obj = Url.parse(`${proto}://${value}`, true);
          }
          this.once('set', prop => prop.merge(obj, { suppress: true }));
        }
        return undefined;
      } else { // getter
        return Url.format(this.container);
      }
    },
    protocol(value) {
      if (arguments.length) {
        if (value) {
          value = value.replace(':','')
          this.content = value
        }
      }
      return this.content;
    },
    query(value) {
      if (arguments.length) { // setter
        // ensure this query container is always initialized with defaults
        if (!value) this.content = {};
      }
      return this.content;
    }
  },
  // Bind Personas
  Connector: {
    async connect(remote) {
      const { uri } = remote
      const { socket } = await this.in('/net:connect').do(remote);
      this.send('net:connection', { uri, socket })
    },
    request
  },
  Listener: { listen },

  // Bind Remote Procedure Calls
  connect(remote) {
    const Socket = this.use('net:socket')
    let { uri, socket, port, hostname, query } = remote
    let { timeout=0, retry, max } = query
    const reconnect = async () => {
      if (socket.closing || !retry) {
        socket.end();
        return
      }
      retry = await this.after(retry, max)
      this.debug(`reconnect to ${uri} (retry: ${retry})`)
      socket.connect(port, hostname)
    }
    socket = new Socket
    socket.setNoDelay()
    socket.setKeepAlive(Boolean(retry));
    socket.setTimeout(timeout);
    
    socket.on('error', err => this.error(err));
    socket.on('timeout', reconnect);
    socket.on('close', reconnect);
    
    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        this.info(`connected to ${uri}`);
        socket.removeListener('timeout', reconnect);
        resolve({ socket })
        if (retry) retry = 100
      })
      this.debug(`attempt ${uri}`)
      socket.connect(port, hostname)
      // TODO: preserve this in module configuration state
      //this.in('/net:topology/remote').add(remote)
    })
  },
  // TODO: FUTURE
  // async request(opts) {
  //   const { socket } = await this.in('/net:connect').do(opts)
  // }
})

function request(opts) {
  const net = this.use('net:net');
  let { socket, data } = opts;
  if (!socket || socket.closing) {
    const { uri, hostname: host, port, query={} } = opts;
    const { timeout } = query;
    let buffer = ''
    this.debug(`making a new connection to ${uri}...`)
    socket = net.createConnection({ port, host, timeout }, () => {
      this.info(`connected to ${uri} sending request...`);
      socket.write(data + '\r\n');
      socket.end()
    });
    socket.on('data', (data) => {
      this.debug(`received ${data.length} bytes data from ${uri}`);
      buffer += data.toString()
    });
    socket.on('end', () => {
      this.info(`disconnected from ${uri}, returning ${buffer.length} bytes`);
      this.send('net:response', { uri, socket, data: buffer });
    })
    socket.on('timeout', () => this.warn(`connection to ${uri} timeout`))
    socket.on('error', this.error.bind(this))
  } else {
    socket.write(data + '\r\n');
  }
}

function listen(local) {
  const Server = this.use('net:server')
  let { socket: server, protocol, port, hostname, uri } = local
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

