'use strict'

const KineticStream  = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticTrigger = require('./lib/trigger')

const kos = {
  reactor() { return new KineticReactor(...arguments) },

  reactors: new Map,
  register(reactor) {
    if (reactor instanceof KineticReactor)
      kos.reactors.set(reactor.id, reactor)
  },

  Stream:  KineticStream,
  Reactor: KineticReactor,
  Trigger: KineticTrigger
}

global.kos = module.exports = kos['default'] = kos.kos = kos
