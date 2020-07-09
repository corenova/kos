require('yang-js');

const Schema = require('./kinetic-http.yang');

Schema.bind({
  // Bind RPCs
  'rpc(http:request)': async (ctx, input) => {
    const agent = ctx.use('http:agent');
    let { url, type='json', method, header={}, query='', timeout, data } = input;
    method = method.toLowerCase();
    let request = agent[method](url).type(type).set(header).query(query);
    if (type !== 'none') request.type(type);
    if (timeout) request.timeout(timeout);
    switch (method) {
    case 'post':
    case 'put':
    case 'patch':
      request = request.send(data);
      break;
    }
    return request
      .catch(err => {
        switch (err.code) {
        case 'ABORTED':
          ctx.logError(`request exceeded ${timeout}ms to ${method} ${url}`, err);
          break;
        default:
	  if (err.status) {
            ctx.logWarn(`${err.status} on ${method} ${url}`, err.response);
	  } else {
	    ctx.logWarn(err);
	  }
        }
        throw err;
      })
  },
});

Schema.at('Connector').bind({
  
  request: async (ctx, input) => {
    try { ctx.send('http:response', await ctx.at('/http:request').push(input)); }
    catch (e) { ctx.logError(`unable to process http:request`, e); }
  },
  
});

Schema.at('Listener').bind({
  
  listen: async (ctx, local) => {
    const http = ctx.use('http:server')
    let { server, protocol, port, hostname, uri } = local
    if (!server) {
      let server = http.createServer((req, res) => {
	ctx.send('http:server-request', { req, res })
      })
      server.on('connection', socket => {
	let uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
	ctx.logInfo(`accept ${uri}`)
	ctx.send('net:connection', { uri, socket })
      })
      server.on('listening', () => {
	ctx.logInfo(`listening on ${uri}`)
	ctx.send('http:server', server)
      })
      server.on('error', err => ctx.logError(err));
    }
    ctx.logDebug(`attempt ${uri}`)
    server.listen(port, hostname)
  },

  route: async (ctx, server, route) => undefined,

});

module.exports = Schema;
