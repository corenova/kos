// HTTP transaction flow
//
// NOTE: this flow REQUIREs either the 'superagent' or 'express'
// module and will become active once it receives it from the upstream
// (or fed by the user)
//
// Streams should actively AVOID requiring dependency modules at the
// module-level (unless part of Node.js runtime). It should be
// declared at the stream-level so that the CONSUMER of the stream can
// decide how to fulfill the necessary dependency.

const kos = require('..')

const HttpClient = kos.create('kos-http-client')
  .summary("Provides HTTP client transforms utilizing 'superagent' module")
  .require('module/http')
  .require('module/superagent')
  .in('http/request')
  .out('http/request/get')
  .out('http/request/post')
  .out('http/request/put')
  .out('http/request/patch')
  .out('http/request/delete')
  .bind(function classify(req) {
    if (!req.method) return this.throw('invalid METHOD')
    switch (req.method.toUpperCase()) {
    case 'GET':    this.send('http/request/get', req); break;
    case 'POST':   this.send('http/request/post', req); break;
    case 'PUT':    this.send('http/request/put', req); break;
    case 'PATCH':  this.send('http/request/patch', req); break;
    case 'DELETE': this.send('http/request/patch', req); break;
    }
  })
  // example of dynamic merge of common actions to share common state
  .in('http/request/get').out('http/response').bind(handleRequest)
  .in('http/request/post').out('http/response').bind(handleRequest)
  .in('http/request/put').out('http/response').bind(handleRequest)
  .in('http/request/patch').out('http/response').bind(handleRequest)
  .in('http/request/delete').out('http/response').bind(handleRequest)

const HttpServer = kos.create('kos-http-server')
  .summary("Provides HTTP server transactions")
  .require('module/http')
  .in('http/listen').out('http/server').bind(createServer)
  .in('http/server','http/route').out('http/server/request').bind(handleRoute)

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.create('kos-http')
  .summary("Provides HTTP client and/or server transforms")
  .include(HttpClient)
  .include(HttpServer)
  // actions
  .in('http/request/get/url').out('http/request/get')
  .bind(function simpleGet(url) {
    this.send('http/request/get', { url: url })
  })
  .in('http/server/request','http/proxy').out('http/request').bind(proxy)

function handleRequest(req) {
  let agent = this.fetch('module/superagent')
  let method = this.trigger.replace(/.*\/(\w+)$/,'$1').toLowerCase()
  let { url, data } = req

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
  let http = this.fetch('module/http')
  let { protocol, hostname, port, retry, max } = normalizeOptions(opts)

  let server = http.createServer((request, response) => {

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

function handleRoute(server, route) {

}

function proxy(req, proxy) {
  if (msg.key === 'http/server/request') {
    req.host = proxy.host
    this.send('http/request', req)
  }
}
