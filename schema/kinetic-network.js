'use strict'

require('yang-js')

const Url = require('url');
const Schema = require('./kinetic-network.yang');

Schema.bind({
  'grouping(endpoint)/uri': {
    get: (ctx) => Url.format(ctx.get('..')),
    set: (ctx, value) => {
      if (value) {
        let obj = Url.parse(value, true);
        if (!obj.slashes) {
          let proto = ctx.at('../protocol').schema.default.tag;
          obj = Url.parse(`${proto}://${value}`, true);
        }
	// XXX - do we need this?
	// ctx.parent.once('update', prop => prop.merge(obj, { suppress: true }));
	ctx.at('..').push(obj);
      }
      return value;
    },
  },
  'grouping(endpoint)/protocol': {
    set: (ctx, value) => value ? value.replace(':', '') : value
  },
  'grouping(endpoint)/query': {
    set: (ctx, value) => value ? value : {}
  },
});

// Bind Remote Procedure Calls
Schema.bind({
  // '/net:topology/remote/active': {
  //   get: (ctx) => ctx.at('/net:session/connection').has(ctx.get('../uri'))
  // },
  // '/net:topology/local/connections': {
  //   get: (ctx) => [].concat(ctx.get(`/net:session/connection[source = '${ctx.get('../uri')}']/uri`))
  // },

  'rpc(connect)': (ctx, remote) => {
    const Socket = ctx.use('net:socket')
    let { uri, socket, port, hostname, query } = remote
    let { timeout=0, retry, max } = query
    const reconnect = async () => {
      if (socket.closing || !retry) {
        socket.end();
        return
      }
      retry = await ctx.after(retry, max)
      ctx.logDebug(`reconnect to ${uri} (retry: ${retry})`)
      socket.connect(port, hostname)
    }
    socket = new Socket
    socket.setNoDelay()
    socket.setKeepAlive(Boolean(retry));
    socket.setTimeout(timeout);
    
    socket.on('error', err => ctx.logError(err));
    socket.on('timeout', reconnect);
    socket.on('close', reconnect);
    
    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        ctx.logInfo(`connected to ${uri}`);
        socket.removeListener('timeout', reconnect);
        resolve({ socket })
        if (retry) retry = 100
      })
      ctx.logDebug(`attempt ${uri}`)
      socket.connect(port, hostname)
      // TODO: preserve this in module configuration state
      //this.in('/net:topology/remote').add(remote)
    });
  },
  
});

Schema.at('Connector').bind({
  
  connect: async (ctx, remote) => {
    const { uri } = remote;
    const { socket } = await ctx.at('/net:connect').push(remote);
    ctx.send('net:connection', { uri, socket });
  },

  request: async (ctx, opts) => {
    const net = ctx.use('net:net');
    let { socket, data } = opts;
    if (!socket || socket.closing) {
      const { uri, hostname: host, port, query={} } = opts;
      const { timeout } = query;
      let buffer = ''
      ctx.logDebug(`making a new connection to ${uri}...`)
      socket = net.createConnection({ port, host, timeout }, () => {
	ctx.logInfo(`connected to ${uri} sending request...`);
	socket.write(data + '\r\n');
	socket.end();
      });
      socket.on('data', (data) => {
	ctx.logDebug(`received ${data.length} bytes data from ${uri}`);
	buffer += data.toString()
      });
      socket.on('end', () => {
	ctx.logInfo(`disconnected from ${uri}, returning ${buffer.length} bytes`);
	ctx.send('net:response', { uri, data: buffer });
	socket.destroy();
      });
      socket.on('close', () => {
	ctx.logInfo(`client socket to ${uri} is closed`);
      });
      socket.on('timeout', () => {
	socket.destroy(`request exceeded ${timeout}ms to ${uri}`);
      });
      socket.on('error', err => ctx.logError(err));
    } else {
      socket.write(data + '\r\n');
    }
  },
});

Schema.at('Listener').bind({

  listen: async (ctx, local) => {
    const Server = ctx.use('net:server');
    let { socket: server, protocol, port, hostname, uri } = local;
    if (!server) {
      server = new Server;
      server.on('connection', socket => {
	const uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
	ctx.logInfo(`accept connection from ${uri}`)
	ctx.send('net:connection', { uri, socket, server: local.uri })
      })
      server.on('listening', () => {
	ctx.logInfo('listening', uri)
	ctx.send('net:server', server)
      })
      server.on('error', err => ctx.logError(err));
    }
    // TODO: preserve this in module configuration state
    //this.in('/net:topology/local').add(local)
    ctx.logDebug(`attempt ${uri}`);
    server.listen(port, hostname);
  },
  
});

module.exports = Schema;

