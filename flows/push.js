'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-push')
  .summary('Provide dataflow stream push to a remote flow')
  .import(NetFlow)
  .default('flows', new Set)
  .in('push').out('net/connect/url','net/listen/url').bind(push)
  .in('push/connect').out('push').bind(pushConnect)
  .in('push/listen').out('push').bind(pushListen)
  .in('net/stream').bind(pushKineticObjects)
  .in('flow').bind(collectFlows)

function push([ method, url ]) {
  switch (method) {
  case 'connect': this.send('net/connect/url', url); break;
  case 'listen': this.send('net/listen/url', url); break;
  }
}

function pushConnect(url) {
  this.send('push', [ 'connect', url ])
}

function pushListen(url) {
  this.send('push', [ 'listen', url ])
}

function pushKineticObjects(stream) {
  let flows = Array.from(this.fetch('flows'))
  // TODO: advertise available flows?
  this.stream.pipe(stream)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
