'use strict';

const { kos = require('..') } = global

//const sync = require('./sync')
// const pull = requrie('./pull')
// const push = require('./push')

module.exports = kos.create('peer')
  .desc('reactions to linked peer persona')
  .pass(true)

  //.load(sync)
  //.load(pull)
  //.load(push)

  .in('link')
  .out('peer')
  .bind(create)

  .in('persona')
  .bind(synchronize)

function create(link) {
  const { addr, socket, server, opts } = link
  const peer = this.get(addr) || this.clone(link)
  this.has(addr) || this.set(addr, peer)

  socket.on('active', () => {
    let io = peer.io({
      error: false
    })
    socket.pipe(io).pipe(socket)
    socket.on('close', () => {
      socket.destroy()
      if (server) {
        peer.leave()
        peer.end()
        this.delete(addr)
      } else {
        peer.emit('inactive')
      }
    })
    peer.resume()
    this.send('peer', peer)
  })
}

function synchronize(persona) {
  const addr = this.get('addr')
  if (persona instanceof kos.Persona) {
    this.set('target', persona)
  } else {
    const { label, id } = persona
    persona.enabled = false
    this.info(`importing '${label}' persona (${id}) from:`, addr)
    this.load(persona)
  }
}





//
// REVIEW LATER
//
// internal helper functions
function absorb(persona) {
  if (persona instanceof kos.Persona) {
    const exists = this.find(persona.id)
    if (exists && exists.parent === this.reactor) 
      exists.leave()
    // XXX - cannot recall reason for this logic...
    // if (this.flow._personas.has(persona.name)) 
    //   this.unload(this.flow._personas.get(persona.name))
  } else {
    persona.enabled = false
    this.info('import remote persona:', persona.label)
    this.load(persona)
  }
}

function unload(id) {
  const exists = this.find(id)
  exists && exists.leave()
}

