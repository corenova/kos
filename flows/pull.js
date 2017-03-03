'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-pull')
  .summary('Provide dataflow stream pull from remote flow(s)')
  .import(NetFlow)
  .default('flows', new Set)
  .in('pull').out('net/connect/url','net/listen/url').bind(pull)
  .in('pull/connect').out('pull').bind(pullConnect)
  .in('pull/listen').out('pull').bind(pullListen)
  .in('net/stream').bind(pullKineticObjects)
  .in('flow').bind(collectFlows)

function pull([ method, url ]) {
  switch (method) {
  case 'connect': this.send('net/connect/url', url); break;
  case 'listen': this.send('net/listen/url', url); break;
  }
}

function pullConnect(url) {
  this.send('pull', [ 'connect', url ])
}

function pullListen(url) {
  this.send('pull', [ 'listen', url ])
}

function pullKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  stream.pipe(this.stream)  
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
