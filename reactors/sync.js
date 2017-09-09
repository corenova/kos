'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.create('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(link)

  .in('sync/connect')
  .out('link/connect/url')
  .bind(syncConnect)

  .in('sync/listen')
  .out('link/listen/url')
  .bind(syncListen)

  .in('link/stream')
  .out('sync', 'unsync')
  .bind(syncStream)

  .in('reactor')
  .out('sync')
  .bind(syncReactor)

function syncConnect(url)     { this.send('link/connect/url', url) }
function syncListen(url)      { this.send('link/listen/url', url) }
function syncReactor(reactor) { this.send('sync', reactor) }

function sync(reactor) {
  if (reactor instanceof kos.Reactor) {
    if (this.parent._reactors.has(reactor.name)) 
      this.parent.unload(this.parent._reactors.get(reactor.name))
  } else {
    reactor.enabled = false
    if (kos._reactors.has(reactor.name))
      this.info('ignore locally available reactor:', reactor.name)
    else {
      this.info('import remote reactor:', reactor.name)
      this.parent.load(reactor)
    }
  }
}
function unsync(id) {
  const exists = this.parent.find(id)
  exists && exists.parent.unload(exists)
}

function syncStream(peer) {
  const addr = peer.state.get('addr')
  const { repair } = peer.state.get('opts')

  // perform sync HANDSHAKE once peer is active
  this.debug('synchronizing with:', addr)
  peer.send('sync', kos) // advertise KOS to remote peer
  peer.once('data', token => {
    const { key, value } = token
    if (key !== 'sync')
      return this.error("unexpected initial token from peer", key, value)
    if (value.id === kos.id)
      return this.warn('detected circular sync loop from peer', addr)

    this.info(`importing '${value.name}' reactor (${value.id}) from:`, addr)
    value.name = `sync(${addr})`
    // remove any reactors from peer that are also locally
    // available in order to prevent further propagation of locally
    // handled tokens into the distributed KOS cluster
    //
    // disable the rest so they don't participate in dataflow
    // processing
    value.reactors = value.reactors.filter(r => {
      r.enabled = false
      return !kos._reactors.has(r.name)
    })
    this.debug(`importing ${value.reactors.length} new reactors:`, value.reactors.map(r => r.name))
    const reactor = kos.create(value).link(peer)
      .in('sync').bind(sync)
      .in('unsync').bind(unsync)
    peer.once('inactive', () => { 
      reactor.unlink(peer)
      if (repair) {
        reactor.info('repairing dataflow with peer')
        reactor.reactors.forEach(r => r.enable())
        reactor.send('reactor', reactor) 
      }
    })
    peer.once('active', () => {
      reactor.info('resuming dataflow to peer')
      kos.unload(reactor)
      this.feed('link/stream', peer) // re-initiate sync
    })
    peer.on('destroy', () => {
      this.debug('destroying sync stream, unload:', reactor.name)
      reactor.unlink(peer)
      kos.unload(reactor)
      // inform others peer is gone
      this.send('unsync', reactor.id)
    })
    // inform others about new peer reactor
    this.debug("informing others about new peer reactor from", addr)
    this.send('sync', reactor)
    kos._load(reactor)
  })
}
