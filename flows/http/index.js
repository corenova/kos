const kos = require('../..')
const request = require('superagent')

module.exports = kos.flow
  .in('http/request').out('http/request/get','http/request/post').bind(function(msg) {
    let req = msg.value
	if (req.method === 'GET')  this.send('http/request/get', req)
	if (req.method === 'POST') this.send('http/request/post', req)
  })
  .in('http/request/get').out('http/response').bind(function(msg) {
	let { url } = msg.value
	request.get(url).end((err, res) => {
	  if (!err) this.send(res)
	})
  })
  .in('http/request/post').out('http/response').bind(function(msg) {
	let { url , data } = msg.value
	request.post(url).data(data).end((err, res) => {
	  if (!err) this.send(res)
	})
  })
  .in('http/request/get/url').out('http/request/get').bind(function(msg) {
	this.send({ url: msg.value })
  })
  .in('http/response').out('http/response/body').bind(function(msg) {
	this.send(msg.value.body)
  })
  
