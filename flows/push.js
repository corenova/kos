'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-push')
  .summary('Provide dataflow stream push to a remote flow')
  .import(NetFlow)
  .default('flows', new Set)
  .in('push/connect').out('net/connect/url').bind(pushConnect)
  .in('push/listen').out('net/listen/url').bind(pushListen)
  .in('net/stream').bind(pushKineticObjects)
  .in('flow').bind(collectFlows)

function pushConnect(url) {
  this.send('net/connect/url', url)
}

function pushListen(url) {
  this.send('net/listen/url', url)
}

function pushKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  this.stream.pipe(stream)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
