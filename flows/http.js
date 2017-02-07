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

const HttpClientFlow = kos.flow
  .label('kos:flow:http:client')
  .summary("Provides HTTP client flows utilizing 'superagent' module")
  .require('module/superagent')
  .in('http/request')
  .out('http/request/get','http/request/post','http/request/put')
  .out('http/request/delete','http/request/patch')
  .bind(function classify(msg) {
    let req = msg.value
    if (req.method === 'GET')  this.send('http/request/get', req)
    if (req.method === 'POST') this.send('http/request/post', req)
  })
  .in('http/request/get').out('http/response').bind(handleRequest)
  .in('http/request/post').out('http/response').bind(handleRequest)
  .in('http/request/put').out('http/response').bind(handleRequest)
  .in('http/request/delete').out('http/response').bind(handleRequest)
  .in('http/request/patch').out('http/response').bind(handleRequest)

const HttpServerFlow = kos.flow
  .label('kos:flow:http:server')
  .summary("Provides HTTP server flows utilizing 'express' module")
  .require('module/express')
  .in('http/listen').out('http/server').bind(runServer)
  .in('http/server','http/route').out('http/request').bind(handleRoute)

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.flow
  .label('kos:flow:http')
  .summary("Provides HTTP client and/or server flows")
  .use(HttpClientFlow)
  .use(HttpServerFlow)
  .in('http/request/get/url').out('http/request/get').bind(function simpleGet(msg) {
    this.send({ url: msg.value })
  })
  .in('http/response').out('http/response/body').bind(function extractBody(msg) {
    this.send(msg.value.body)
  })

function handleRequest(msg) {
  let agent = this.pull('module/superagent')
  let method = msg.key.replace(/^.+\/(\w+)$/,'$1')
  let { url, data } = msg.value

  switch (method) {
  case 'get':
  case 'delete':
    agent[method](url).end((err, res) => { if (!err) this.send(res) })
    break;
  case 'post':
  case 'put':
  case 'patch':
    agent[method](url).data(data).end((err, res) => { if (!err) this.send(res) })
    break;
  }
}

function runServer(msg) {

}

function handleRoute(msg) {

}
