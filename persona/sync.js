'use strict';

const { kos = require('..') } = global

module.exports = kos.create('sync')
  .desc('reactions to synchronize dataflow with remote peer(s)')
  .in('peer').out('sync').bind(handshake)

function handshake(peer) {
  const addr = peer.state.get('addr')
  const { repair } = peer.state.get('opts')

  // once the peer persona joins the intended target persona
  

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
      this.feed('peer', peer) // re-initiate sync
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

function synchronize(persona) {
  if (persona.id !== kos.id) {
    
  }
}
