'use strict';

const { kos = require('..') } = global
const peerPersona = require('./peer')
const linkPersona = require('./link')

module.exports = kos.create('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(linkPersona)

  .in('sync/connect')
  .out('link/connect/url')
  .bind(syncConnect)

  .in('sync/listen')
  .out('link/listen/url')
  .bind(syncListen)

  .in('link/stream')
  .out('peer', 'unload')
  .bind(synchronize)

function syncConnect(url)     { this.send('link/connect/url', url) }
function syncListen(url)      { this.send('link/listen/url', url) }

function synchronize(stream) {
  const addr = stream.state.get('addr')
  const { repair } = stream.state.get('opts')
  const { parent } = this.flow

  // perform sync HANDSHAKE once stream is active
  this.debug('synchronizing with:', addr);
  stream.send('sync', parent); // advertise parent persona to remote stream
  stream.once('data', token => {
    const { topic, data } = token
    if (topic !== 'sync') {
      // XXX - we should terminate connection?
      return this.error("unexpected initial token from peer", topic, data)
    }
    if (data.id === parent.id)
      return this.warn('detected circular sync loop from peer', addr)

    this.info(`importing '${data.label}' persona (${data.id}) from:`, addr)
    //data.enabled = false
    // instantiate the peer persona
    const peer = peerPersona({ address: addr }).load(data).link(stream).join(kos)
    stream.once('inactive', () => { 
      peer.unlink(stream)
      if (repair) {
        this.info('repairing dataflow with peer')
        peer.personas.forEach(r => r.enable())
        // here we send it from the dynamic persona
        peer.send('persona', peer) 
      }
    })
    stream.once('active', () => {
      this.info('resuming dataflow to peer')
      peer.leave(kos)
      this.feed('link/stream', stream) // re-initiate sync
    })
    stream.on('destroy', () => {
      this.debug('destroying sync stream, unload:', peer.label)
      peer.unlink(stream)
      peer.leave(kos)
      // inform others peer is gone
      this.send('unload', peer.id)
    })
    // inform others about new peer persona
    this.debug("informing others about new peer persona from", addr)
    this.send('peer', peer)
  })

}
