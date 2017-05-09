'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.create('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(link)

  .in('sync/connect').out('link/connect/url').bind(syncConnect)
  .in('sync/listen').out('link/listen/url').bind(syncListen)
  .in('link/stream').bind(syncStream)

  .in('reactors').bind(syncReactors)
  .in('reactor').bind(importReactor)


function syncConnect(url) { this.send('link/connect/url', url) }
function syncListen(url)  { this.send('link/listen/url', url) }
function syncStream(stream) {
  stream.feed('reactors', kos.reactors)
  this.parent.pipe(stream)
  stream.on('active', () => {
    stream.pipe(this.parent)
    this.debug('synchronizing')
  })
}
function syncReactors(reactors) {
  kos.load(...reactors)
}
function importReactor(reactor) {
  if (reactor instanceof kos.Reactor) return
  kos.load(reactor)
}
