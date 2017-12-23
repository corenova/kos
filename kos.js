'use strict'

const Reactor  = require('./lib/reactor')
const Reaction = require('./lib/reaction')
const Dataflow = require('./lib/dataflow')
const Stimulus = require('./lib/stimulus')

const kos = new Reactor({
  label: 'kos',
  purpose: 'reactions to flow of stimuli',
  passive: true
})

// expose main class definitions
kos.Reactor  = Reactor
kos.Reaction = Reaction
kos.Dataflow = Dataflow
kos.Stimulus = Stimulus

global.kos = module.exports = kos['default'] = kos.kos = kos
