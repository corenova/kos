require('yang-js')

module.exports = require('./kinetic-http.yang').bind({
  // Bind RPCs
  request(input) {
    const agent = this.use('http:agent');
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
          this.error(`request exceeded ${timeout}ms to ${method} ${url}`, err);
          break;
        default:
          this.warn(`${err.status} on ${method} ${url}`,err.response);
        }
        throw err;
      })
  },
  listen(local) {
    const http = this.use('http:server')
    const { protocol, port, hostname, uri } = local;
    const { server = http.createServer() } = local;
    this.debug(`attempt ${uri}`)
    server.listen(port, hostname);
    return { server };
  },
  // Bind Transforms
  async requesting(input, output) {
    try { output.response.push(await this.in('/http:request').do(input.request)); }
    catch (e) { this.error(`unable to process http:request`, e); }
  },
  async listening(input, output) {
    try {
      const { protocol } = input.local;
      const { server } = await this.in('/http:listen').do(input.local);
      server.on('connection', socket => {
	let uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`;
	this.info(`accept new connection from ${uri}`)
	output.connection.push({ uri, socket });
      })
      server.on('listening', () => {
	this.info(`listening on ${uri}`)
	output.server.push(server);
      })
      server.on('error', this.error.bind(this))
    }
    catch (e) { this.error('listening failed', e) }
  },
});
