'use strict';

const { kos = require('..') } = global

module.exports = kos.create('peer')
  .desc('reactions to peer persona')
  .pass(true)

  //.in('persona').bind(absorb)
  //.in('unload').bind(unload)

// internal helper functions
function absorb(persona) {
  if (persona instanceof kos.Persona) {
    const exists = this.flow.find(persona.id)
    if (exists && exists.parent === this.flow) 
      exists.leave()
    // XXX - cannot recall reason for this logic...
    // if (this.flow._personas.has(persona.name)) 
    //   this.flow.unload(this.flow._personas.get(persona.name))
  } else {
    persona.enabled = false
    this.info('import remote persona:', persona.label)
    this.flow.load(persona)
  }
}
function unload(id) {
  const exists = this.flow.find(id)
  exists && exists.leave()
}
