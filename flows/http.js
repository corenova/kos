// HTTP transaction flow
//
// NOTE: this flow REQUIREs the 'superagent' module and will become
// active once it receives it from the upstream (or fed by the user)
//
// Flows should actively AVOID requiring dependency modules at the
// module-level (unless part of Node.js runtime). It should be
// declared at the flow-level so that the CONSUMER of the flow can
// decide how to fulfill the necessary dependency.

const kos = require('..')

const HttpFlow = kos.flow
  .label('kos:flow:http')
  .summary("Provides HTTP transaction flow utilizing 'superagent' module")
  .require('module/superagent')
  .in('http/request')
  .out('http/request/get','http/request/post','http/request/put')
  .out('http/request/delete','http/request/patch')
  .bind(function classify(msg) {
    let req = msg.value
	if (req.method === 'GET')  this.send('http/request/get', req)
	if (req.method === 'POST') this.send('http/request/post', req)
  })
  .in('http/request/get').out('http/response').bind(invoke)
  .in('http/request/get/url').out('http/request/get').bind(function simpleGet(msg) {
	this.send({ url: msg.value })
  })
  .in('http/request/post').out('http/response').bind(invoke)
  .in('http/request/put').out('http/response').bind(invoke)
  .in('http/request/delete').out('http/response').bind(invoke)
  .in('http/request/patch').out('http/response').bind(invoke)
  .in('http/response').out('http/response/body').bind(function extractBody(msg) {
	this.send(msg.value.body)
  })

module.exports = HttpFlow

function invoke(msg) {
  let request = this.pull('module/superagent')
  let method = msg.key.replace(/^.+\/(\w+)$/,'$1')
  let { url, data } = msg.value

  switch (method) {
  case 'get':
  case 'delete':
	request[method](url).end((err, res) => { if (!err) this.send(res) })
	break;
  case 'post':
  case 'put':
  case 'patch':
	request[method](url).data(data).end((err, res) => { if (!err) this.send(res) })
	break;
  }
}
