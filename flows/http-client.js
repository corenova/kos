// HTTP client transaction flow
//
// NOTE: this flow REQUIREs the 'superagent' and 'http' modules and
// will become active if already present locally, receives it from the
// upstream, or fed by the user directly.

const { kos = require('..') } = global

module.exports = kos.create('http-client')
  .summary("Provides HTTP client transforms utilizing 'superagent' module")
  .require('module/http')
  .require('module/superagent')
  .in('http/request')
  .out('http/request/get')
  .out('http/request/post')
  .out('http/request/put')
  .out('http/request/patch')
  .out('http/request/delete')
  .bind(classifyRequest)
  // example of dynamic merge of common actions to share common state
  .in('http/request/get').out('http/response').bind(handleRequest)
  .in('http/request/post').out('http/response').bind(handleRequest)
  .in('http/request/put').out('http/response').bind(handleRequest)
  .in('http/request/patch').out('http/response').bind(handleRequest)
  .in('http/request/delete').out('http/response').bind(handleRequest)


function classifyRequest(req) {
  if (!req.method) return this.throw('invalid METHOD')
  switch (req.method.toUpperCase()) {
  case 'GET':    this.send('http/request/get', req); break;
  case 'POST':   this.send('http/request/post', req); break;
  case 'PUT':    this.send('http/request/put', req); break;
  case 'PATCH':  this.send('http/request/patch', req); break;
  case 'DELETE': this.send('http/request/delete', req); break;
  }
}

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

