require('yang-js')

module.exports = require('./kinetic-http.yang').bind({
  // Bind RPCs
  request(input) {
    const agent = this.use('http:agent');
    let { url, type='json', method, header={}, query='', timeout, data } = input;
    method = method.toLowerCase();
    let request = agent[method](url).type(type).set(header).query(query);
    if (timeout) request.timeout(timeout);
    
    this.debug(`curl -v -X ${method} ${url} -d '${JSON.stringify(data)}'`)
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
  // Bind Personas
  Connector: {
    async request(input) {
      try { this.send('http:response', await this.in('/http:request').do(input)); }
      catch (e) { this.error(`unable to process http:request`, e); }
    },
    get(input) {
      this.send('http:request', input);
    },
  },
  Listener: { listen, route }
})

function listen(local) {
  const http = this.use('http:server')
  let { server, protocol, port, hostname, uri } = local
  if (!server) {
    let server = http.createServer((req, res) => {
      this.send('http:server-request', { req, res })
    })
    server.on('connection', socket => {
      let uri = `${protocol}//${socket.remoteAddress}:${socket.remotePort}`
      this.info(`accept ${uri}`)
      this.send('net:connection', { uri, socket })
    })
    server.on('listening', () => {
      this.info(`listening on ${uri}`)
      this.send('http:server', server)
    })
    server.on('error', this.error.bind(this))
  }
  this.debug(`attempt ${uri}`)
  server.listen(port, hostname)
}

function route(server, route) {

}

function proxy(req, proxy) {
  this.send('http:request', Object.assign({}, req, {
    host: proxy.host
  }))
}
