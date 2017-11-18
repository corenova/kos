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
  .out('sync', 'unsync', 'persona')
  .bind(syncStream)

  .in('persona')
  .out('sync')
  .bind(syncPersona)

function syncConnect(url)     { this.send('link/connect/url', url) }
function syncListen(url)      { this.send('link/listen/url', url) }
function syncPersona(persona) { this.send('sync', persona) }

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

    this.info(`importing '${value.label}' persona (${value.id}) from:`, addr)
    value.label = `sync(${addr})`
    // remove any personas from peer that are also locally
    // available in order to prevent further propagation of locally
    // handled tokens into the distributed KOS cluster
    //
    // disable the rest so they don't participate in dataflow
    // processing
    value.personas = value.personas.filter(r => {
      r.enabled = false
      return !kos.personas.some(x => x.label === r.label)
    })
    this.debug(`importing ${value.personas.length} new personas:`, value.personas.map(r => r.label))
    if (value.personas[0])
      console.log(value.personas[0].reactions)
    const peerPersona = kos.create(value).link(peer)
      .in('sync').bind(sync)
      .in('unsync').bind(unsync)
    if (peerPersona.personas[0])
      console.log(peerPersona.personas[0].reactions)
    peer.once('inactive', () => { 
      peerPersona.unlink(peer)
      if (repair) {
        this.info('repairing dataflow with peer')
        peerPersona.personas.forEach(r => r.enable())
        // here we send it from the dynamic persona
        peerPersona.send('persona', peerPersona) 
      }
    })
    peer.once('active', () => {
      this.info('resuming dataflow to peer')
      kos.unload(peerPersona)
      this.feed('link/stream', peer) // re-initiate sync
    })
    peer.on('destroy', () => {
      this.debug('destroying sync stream, unload:', peerPersona.label)
      peerPersona.unlink(peer)
      kos.unload(peerPersona)
      // inform others peer is gone
      this.send('unsync', peerPersona.id)
    })
    // inform others about new peer persona
    this.debug("informing others about new peer persona from", addr)
    this.send('sync', peerPersona)
    peerPersona.join(kos)
  })

  // internal helper functions
  function sync(persona) {
    if (persona instanceof kos.Persona) {
      const exists = this.flow.find(persona.id)
      if (exists && exists.parent === this.flow) 
        exists.leave()
      // XXX - cannot recall reason for this logic...
      // if (this.flow._personas.has(persona.name)) 
      //   this.flow.unload(this.flow._personas.get(persona.name))
    } else {
      persona.enabled = false
      if (kos.personas.some(x => x.label === persona.label))
        this.info('ignore locally available persona:', persona.label)
      else {
        this.info('import remote persona:', persona.label)
        this.flow.load(persona)
      }
    }
  }
  function unsync(id) {
    const exists = this.flow.find(id)
    exists && exists.leave()
  }
}
