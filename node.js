'use strict'

const Dataflow = require('./lib/dataflow')
const Reaction = require('./lib/reaction')
const Stream   = require('./lib/stream')

const kos = new Dataflow({
  label: 'kos',
  purpose: 'reactions to flow of stimuli',
  passive: true
})

// expose core class definitions
kos.Dataflow = Dataflow
kos.Reaction = Reaction
kos.Stream   = Stream

global.kos = module.exports = kos['default'] = kos.kos = kos
