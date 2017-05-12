'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.create('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(link)

  .in('sync/connect').out('link/connect/url').bind(syncConnect)
  .in('sync/listen').out('link/listen/url').bind(syncListen)
  .in('link/stream').out('sync').bind(syncStream)
  .in('reactor').out('sync').bind(syncReactor)

function syncConnect(url)     { this.send('link/connect/url', url) }
function syncListen(url)      { this.send('link/listen/url', url) }
function syncReactor(reactor) { this.send('sync', reactor) }
function syncStream(stream) {
  const { addr } = stream.state.get('link')
  const reactor = kos.create({
    name: `sync(${addr})`,
    purpose: `reactions to sync with remote peer`,
    passive: true
  })
  reactor.on('data', token => {
    // prevent propagation of locally supported token keys to the remote stream
    // TODO: optimize this via attribute of token itself
    const internal = kos.reactors
      .filter(x => !x.passive)
      .reduce((a, b) => a.concat(b.inputs), [])
    if (token.match(internal.concat(['module/*']))) return
    stream.write(token)
  })
  stream.on('data', token => {
    const { key, value } = token
    if (key !== 'sync') return reactor.write(token)
    if (value instanceof kos.Reactor) return

    this.info(`importing '${value.name}' reactor (${value.id}) from ${addr}`)
    if (value.name === 'kos') {
      // exclude locally available reactors
      const reactors = value.reactors.filter(x => {
        return !kos.reactors.some(y => x.name === y.name)
      })
      // reset currently loaded reactors
      this.debug('unload reactors...', reactor.reactors.map(x => x.name))
      reactor.reactors.forEach(x => reactor.unload(x))
      reactor.load(...reactors)
      this.debug(`imported ${reactors.length} new reactor(s):`, reactors.map(x => x.name))
    } else {
      kos.reactors.some(x => x.name === value.name) || reactor.load(value)
    }
    // Notify other remote peers about this reactor's new state
    // use reactor.id as origin to skip the current reactor
    this.send('sync', reactor, reactor.id)
  })
  stream.pause()
  stream.on('active', () => {
    stream.feed('sync', kos)
    stream.resume()
    this.debug('synchronizing with:', addr)
  })
  stream.on('destroy', () => {
    this.debug('destroying sync stream, unload:', reactor.name)
    kos.unload(reactor)
    stream.end()
    this.send('sync', kos, reactor.id)
  })
  kos._load(reactor)
}

