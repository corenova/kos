'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-pull')
  .summary('Provide dataflow stream pull from remote flow(s)')
  .import(NetFlow)
  .default('flows', new Set)
  .in('pull/connect').out('net/connect/url').bind(pullConnect)
  .in('pull/listen').out('net/listen/url').bind(pullListen)
  .in('net/stream').bind(pullKineticObjects)
  .in('flow').bind(collectFlows)

function pullConnect(url) {
  this.send('net/connect/url', url)
}

function pullListen(url) {
  this.send('net/listen/url', url)
}

function pullKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  stream.pipe(this.stream)  
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
