'use strict'

const Reactor  = require('./reactor')
const Reaction = require('./reaction')
const Dataflow = require('./dataflow')
const Pulse    = require('./pulse')
const Schema   = require('./schema')

const schema = require('../schema/kinetic-object-swarm.yang')
const kos = new Reactor({ schema }).pass(true)

kos.create = (schema, state) => {
  return new Reactor({ schema, state })
}

// expose main class definitions
kos.Reactor  = Reactor
kos.Reaction = Reaction
kos.Dataflow = Dataflow
kos.Pulse    = Pulse
kos.Schema   = Schema

module.exports = kos
