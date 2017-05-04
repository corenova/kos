'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.reactor('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(link)
  .init('reactors', new Map)

  .in('sync/connect').out('link/connect/url').bind(syncConnect)
  .in('sync/listen').out('link/listen/url').bind(syncListen)
  .in('link/stream').bind(syncStream)

  .in('reactor').bind(collectReactors)

function syncConnect(url) { this.send('link/connect/url', url) }
function syncListen(url)  { this.send('link/listen/url', url) }
function syncStream(stream) {
  const reactors = this.get('reactors')
  stream.feed('reactor', ...Array.from(reactors.values()))
  this.parent.pipe(stream)
  stream.on('active', () => {
    stream.pipe(this.parent)
    this.debug('synchronizing')
  })
}

function collectReactors(reactor) {
  const reactors = this.get('reactors')
  reactors.set(reactor.id, reactor)
}
