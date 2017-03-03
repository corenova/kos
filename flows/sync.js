'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-sync')
  .summary('Provide dataflow stream pull/push to a remote flow')
  .import(NetFlow)
  .default('flows', new Set)
  .in('sync').out('net/connect/url','net/listen/url').bind(sync)
  .in('sync/connect').out('sync').bind(syncConnect)
  .in('sync/listen').out('sync').bind(syncListen)
  .in('net/stream').bind(syncKineticObjects)
  .in('flow').bind(collectFlows)

function sync([ method, url ]) {
  switch (method) {
  case 'connect': this.send('net/connect/url', url); break;
  case 'listen': this.send('net/listen/url', url); break;
  }
}

function syncConnect(url) {
  this.send('sync', [ 'connect', url ])
}

function syncListen(url) {
  this.send('sync', [ 'listen', url ])
}

function syncKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  stream.pipe(this.stream).pipe(stream)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
