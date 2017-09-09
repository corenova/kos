// HTTP transaction flow
//
// NOTE: this flow REQUIREs the 'superagent' or 'http' module and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

const { kos = require('..') } = global

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.create('http')
  .desc('reactions to HTTP client/server requests')

  .pre('module/superagent')
  .in('http/request')
  .out('http/response')
  .bind(clientRequest)

  .in('http/request/get')
  .out('http/request')
  .bind(simpleGet)

  .pre('module/http','module/url')
  .in('http/listen')
  .out('http/server','http/socket','link','http/server/request')
  .bind(createServer)

  .in('http/server/request')
  .out('http/server/request/*')
  .bind(classifyServerTransaction)

  .in('http/server','http/route')
  .out('http/server/request')
  .bind(handleRoute)

  // TODO: future
  //.in('http/server/request','http/proxy').out('http/request').bind(proxy)

function simpleGet(url) {
  this.send('http/request', { url: url, method: 'GET' })
}

function clientRequest(req) {
  const agent = this.get('module/superagent')
  let { url, type='json', method, data } = req
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
    agent[method](url).type(type).send(data).end((err, res) => { 
      if (err) this.throw(err.response.error)
      else this.send('http/response', res) 
    })
    break;
  }
}

function createServer(opts) {
  const [ http, url ] = this.get('module/http', 'module/url')
  if (typeof opts === 'string') {
    let dest = opts
    opts = url.parse(dest, true)
    if (!opts.slashes) opts = url.parse('http://'+dest, true)
  }
  let protocol = opts.protocol || 'http:'
  let hostname = opts.hostname || '0.0.0.0'
  let port     = parseInt(opts.port, 10) || 80

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

function handleRoute(server, route) {

}

function proxy(req, proxy) {
  this.send('http/request', Object.assign({}, req, {
    host: proxy.host
  }))
}
