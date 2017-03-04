'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-sync')
  .summary('Provide dataflow stream pull/push to a remote flow')
  .import(NetFlow)
  .default('flows', new Set)
  .in('sync/connect').out('net/connect/url').bind(syncConnect)
  .in('sync/listen').out('net/listen/url').bind(syncListen)
  .in('net/stream').bind(syncKineticObjects)
  .in('flow').bind(collectFlows)

function syncConnect(url) {
  this.send('net/connect/url', url)
}

function syncListen(url) {
  this.send('net/listen/url', url)
}

function syncKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  stream.pipe(this.stream).pipe(stream)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
