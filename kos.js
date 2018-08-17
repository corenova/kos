'use strict'

const { Reactor, Reaction, Dataflow, Schema, Pulse } = require('./lib')

const schema = require('./schema/kinetic-object-swarm')
const kos = new Reactor({ schema }).pass(true)

// expose main class definitions
kos.Reactor  = Reactor
kos.Reaction = Reaction
kos.Dataflow = Dataflow
kos.Schema   = Schema
kos.Pulse    = Pulse

global.kos = module.exports = kos['default'] = kos.kos = kos
