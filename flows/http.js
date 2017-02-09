// HTTP transaction flow
//
// NOTE: this flow REQUIREs either the 'superagent' or 'express'
// module and will become active once it receives it from the upstream
// (or fed by the user)
//
// Flows should actively AVOID requiring dependency modules at the
// module-level (unless part of Node.js runtime). It should be
// declared at the flow-level so that the CONSUMER of the flow can
// decide how to fulfill the necessary dependency.

const kos = require('..')
const http = require('http')

const HttpClientFlow = kos.flow
  .label('kos-flow-http-client')
  .summary("Provides HTTP client flows utilizing 'superagent' module")
  .require('module/superagent')
  .in('http/request')
  .out('http/request/get')
  .out('http/request/post')
  .out('http/request/put')
  .out('http/request/patch')
  .out('http/request/delete')
  .bind(function classify(msg) {
    let req = msg.value
    if (!req.method) return // should flag error...
    switch (req.method.toUpperCase()) {
    case 'GET':    this.send('http/request/get', req); break;
    case 'POST':   this.send('http/request/post', req); break;
    case 'PUT':    this.send('http/request/put', req); break;
    case 'PATCH':  this.send('http/request/patch', req); break;
    case 'DELETE': this.send('http/request/patch', req); break;
    }
  })
  // example of dynamic merge of common actions
  .in('http/request/get').out('http/response').bind(handleRequest)
  .in('http/request/post').out('http/response').bind(handleRequest)
  .in('http/request/put').out('http/response').bind(handleRequest)
  .in('http/request/patch').out('http/response').bind(handleRequest)
  .in('http/request/delete').out('http/response').bind(handleRequest)

const HttpServerFlow = kos.flow
  .label('kos-flow-http-server')
  .summary("Provides HTTP server flows utilizing 'express' module")
  .require('module/express')
  .in('http/listen').out('http/server').bind(runServer)
  .in('http/server','http/route').out('http/server/request').bind(handleRoute)

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.flow
  .label('kos-flow-http')
  .summary("Provides HTTP client and/or server flows")
  .use(HttpClientFlow)
  .use(HttpServerFlow)
  .in('http/request/get/url').out('http/request/get')
  .bind(function simpleGet(msg) {
    this.send('http/request/get', { url: msg.value })
  })
  .in('http/response').out('http/response/body')
  .bind(function extractBody(msg) {
    this.send('http/response/body', msg.value.body)
  })
  .in('http/server/request','http/proxy').out('http/request').bind(proxy)

function handleRequest({ key, value }) {
  let agent = this.pull('module/superagent')
  let method = key.replace(/\/(\w+)$/,'$1').toLowerCase()
  let { url, data } = value

  switch (method) {
  case 'get':
  case 'delete':
    agent[method](url).end((err, res) => { 
      if (!err) this.send('http/response', res) 
    })
    break;
  case 'post':
  case 'put':
  case 'patch':
    agent[method](url).data(data).end((err, res) => { 
      if (!err) this.send('http/response', res) 
    })
    break;
  }
}

function runServer(msg) {
  let express = this.pull('module/express')
  let app = express()
  
}

function handleRoute(msg) {

}

function proxy(msg) {
  let { req, proxy } = this.get(...this.inputs)
  if (msg.key === 'http/server/request') {
    req.host = proxy.host
    this.send('http/request', req)
  }
}
