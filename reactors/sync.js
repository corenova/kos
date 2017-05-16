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
  const { addr, opts } = stream.state.get('link')
  const reactor = kos.create({
    name: `sync(${addr})`,
    purpose: `reactions to sync with remote peer`,
    passive: true,
    enabled: false
  })
  reactor.on('data', token => {
    if (token.origin === reactor.id || reactor.active) return
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

    if (typeof value === 'string') {
      if (value !== reactor.name) {
        this.info('discovered own reactor name from peer', value)
        reactor.state.set('remote', value)
      }
      return
    }
    if (value.id === kos.id) {
      kos.warn('detected circular sync loop from', addr)
      kos.unload(reactor)
      return
    }
    this.info(`importing '${value.name}' reactor (${value.id}) from ${addr}`)
    if (value.name === 'kos') {
      // exclude locally available reactors
      const reactors = value.reactors.filter(x => {
        return (x.name !== reactor.state.get('remote')) && !kos.reactors.some(y => x.name === y.name)
      })
      // reset currently loaded reactors
      this.debug('unload existing reactors...', reactor.reactors.map(x => x.name))
      reactor.reactors.forEach(x => reactor.unload(x))
      reactor.load(...reactors)
      this.debug(`imported ${reactors.length} new reactor(s):`, reactors.map(x => x.name))
    } else {
      if (kos.reactors.some(x => x.name === value.name)) return
      reactor.load(value)
    }
    // Notify other remote peers about this reactor's new state
    reactor.send('sync', reactor)
  })
  stream.pause()
  stream.on('active', () => {
    if (reactor.active) reactor.disable()
    stream.feed('sync', reactor.name).feed('sync', kos)
    stream.resume()
    this.debug('synchronizing with:', addr)
  })
  stream.on('inactive', () => {
    if (!opts.persist) return
    this.info('maintaining capabilities from', reactor.name)
    restore(reactor)
    reactor.enable()
    reactor.send('reactor', reactor)
    function restore(target) {
      target.triggers.forEach(x => {
        if (x.handler instanceof Function) return
        reactor.info("restoring", x.name)
        try { x._handler = eval('(' + x.handler.source + ')') }
        catch (e) { 
          reactor.error("unable to restore handler from source", x.handler.source, e) 
        }
      })
      target.reactors.forEach(restore)
    }
  })
  stream.on('destroy', () => {
    this.debug('destroying sync stream, unload:', reactor.name)
    kos.unload(reactor)
    stream.end()
    this.send('sync', kos)
  })
  kos._load(reactor)
}

