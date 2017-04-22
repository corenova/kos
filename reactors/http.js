// HTTP transaction flow
//
// NOTE: this flow REQUIREs the 'superagent' or 'http' module and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

const { kos = require('..') } = global

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.reactor('http')
  .desc('reactions to HTTP client/server requests')

  .in('http/request').and.has('module/superagent')
  .out('http/response').bind(clientRequest)

  .in('http/request/get').out('http/request').bind(simpleGet)

  .in('http/listen').and.has('module/http')
  .out('http/server','http/socket','link','http/server/request')
  .bind(createServer)

  .in('http/server/request')
  .out('http/server/request/*')
  .bind(classifyServerTransaction)

  .in('http/server','http/route').out('http/server/request').bind(handleRoute)

  // TODO: future
  //.in('http/server/request','http/proxy').out('http/request').bind(proxy)

function simpleGet(url) {
  this.send('http/request', { url: url, method: 'GET' })
}

function clientRequest(req) {
  let agent = this.get('module/superagent')
  let { url, method, data } = req
  method = method.toLowerCase()
  switch (method) {
  case 'get':
  case 'delete':
    agent[method](url).end((err, res) => { 
      if (err) this.throw(err)
      else this.send('http/response', res) 
    })
    break;
  case 'post':
  case 'put':
  case 'patch':
    agent[method](url).send(data).end((err, res) => { 
      if (err) this.throw(err)
      else this.send('http/response', res) 
    })
    break;
  }
}

function createServer(opts) {
  let http = this.get('module/http')
  let { protocol, hostname, port } = normalizeOptions.call(this, opts)

  let server = http.createServer((request, response) => {
    this.send('http/server/request', { req: request, res: response })
  })
  server.on('connection', sock => {
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info('accept', addr)
    this.send('http/socket', sock)
    this.send('http/link', { addr: addr, socket: sock })
    sock.emit('active')
  })
  server.on('listening', () => {
    this.info('listening', hostname, port)
    this.send('http/server', server)
  })
  server.on('error', this.error.bind(this))
  this.debug('attempt', hostname, port)
  server.listen(port, hostname)
}

function classifyServerTransaction(session) {
  let { req, res } = session
  let method = req.method.toLowerCase()
  this.send('http/server/request/'+method, session)
}

function normalizeOptions(opts) {
  if (typeof opts === 'string') {
    let url = this.get('module/url')
    if (!opts.includes('://'))
      opts = 'http://' + opts
    opts = url.parse(opts, true)
  }
  return {
    protocol: opts.protocol || 'http:',
    hostname: opts.hostname || '0.0.0.0',
    port:     parseInt(opts.port, 10) || 80
  }
}

function handleRoute(server, route) {

}

function proxy(req, proxy) {
  req.host = proxy.host
  this.send('http/request', req)
}
