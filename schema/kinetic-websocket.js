'use strict'

require('yang-js');

const Schema = require('./kinetic-websocket.yang');

Schema.at('Connector').bind({

  connect: async (ctx, remote) => {
    const WebSocket = ctx.use('ws:socket');
    let { uri, socket, port, hostname, query } = remote;
    let { retry, max } = query;
    if (!socket) {
      ctx.logInfo(`connecting to ${uri}`);
      socket = new WebSocket(uri);
      socket.on('connect', () => {
	ctx.logInfo(`connected to ${uri}...`);
	ctx.send('net:connection', { uri, socket });
	if (retry) retry = 100;
      })
      socket.on('close', async () => {
	if (socket.closing || !retry) {
	  ctx.logInfo(`disconnected from ${uri}`);
          return;
	}
	if (typeof retry !== 'number') retry = 100
	//console.log(remote[Symbol.for('property')].in('query').set({ retry: true }))
	ctx.logDebug(`reconnecting to ${uri} in ${retry}ms...`, remote.query);
	retry = await ctx.after(retry, max);
	remote = Object.assign({}, remote, { uri: undefined, query: { retry } })
	ctx.feed('ws:endpoint', remote)
      });
      socket.on('error', err => ctx.logError(err))
    }
  },

});

Schema.at('Listener').bind({

  listen: async (ctx, local) => {
    const Server = ctx.use('ws:server');
    let { socket: server, uri, protocol, hostname, port, pathname } = local
    if (server) {
      ctx.logInfo(`listening on existing server instance`)
      server = new Server({ server })
    } else {
      ctx.logInfo(`listening on ${uri} with ${hostname}:${port}/${pathname}`)
      server = new Server({ hostname, port, pathname })
    }
    server.on('connection', socket => {
      let sock = socket._ws._socket
      let uri = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
      ctx.logInfo(`accept connection from: ${uri}`)
      ctx.send('net:connection', { uri, socket, server: local.uri })
    })
    server.on('error', err => ctx.logError(err))
    ctx.send('ws:server', server)
  },

});

module.exports = Schema;


