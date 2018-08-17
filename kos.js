'use strict'

const Reactor  = require('./lib/reactor')
const Reaction = require('./lib/reaction')
const Dataflow = require('./lib/dataflow')
const Schema   = require('./lib/schema')
const Pulse    = require('./lib/pulse')

const schema = require('./schema/kinetic-object-swarm')
const kos = new Reactor({ schema }).pass(true)

// expose main class definitions
kos.Reactor  = Reactor
kos.Reaction = Reaction
kos.Dataflow = Dataflow
kos.Schema   = Schema
kos.Pulse    = Pulse

global.kos = module.exports = kos['default'] = kos.kos = kos
