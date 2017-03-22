'use strict'

const kos = require('..')

module.exports = kos.create('kos-run')
  .summary('Provides runtime instance management flows')
  .import(kos.load('require'))
  .import(kos.load('npm'))
  .import(kos.load('net'))
  .import(kos.load('http'))

  .default('flows', new Set)

  .in('run').out('http/listen','http/route').bind(runInstance)
  .in('http/server/request').bind(handleStateRequest)
  .in('kos').bind(collectFlows)

function runInstance(opts) {
  let base = opts.base || '/'
  this.send('http/listen', opts)
  //this.send('http/route', { path: '/', methods: [ 'GET' ] })
  // tap into the stream and "publish" every kinetic object into runtime state
  this.stream.on('data', ko => this.post(base + ko.key, ko))
}

function handleStateRequest(http) {
  let { req, res } = http
  switch (req.method) {
  case 'GET': 
    let data = this.fetch(req.url)
    res.setHeader('X-KOS', 'run')
    res.statusCode = data ? 200 : 404
    if (data) {
      res.setHeader('Content-Type', 'application/json')
      res.write(data.toJSON())
    } else {
      this.debug(this.stream.state)
    }
    res.end()
    break;
  }
}

function registerInstance(url) {
  this.send('net/connect/url', url)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
