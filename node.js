'use strict'

const Persona  = require('./lib/persona')
const Reaction = require('./lib/reaction')
const Dataflow = require('./lib/dataflow')
const Stimulus = require('./lib/stimulus')

const kos = new Persona({
  label: 'kos',
  purpose: 'reactions to flow of stimuli',
  passive: true
})

kos.in('persona').bind(function evolve(persona) {
  persona.join(this.flow)
})

// expose main class definitions
kos.Persona  = Persona
kos.Reaction = Reaction
kos.Dataflow = Dataflow
kos.Stimulus = Stimulus

global.kos = module.exports = kos['default'] = kos.kos = kos
