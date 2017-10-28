'use strict'

const KineticStream  = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticTrigger = require('./lib/trigger')
const KineticToken   = require('./lib/token')

const kos = new KineticReactor({
  label: 'kos',
  purpose: 'reactions to kinetic object streams',
  passive: true
})

// expose Kinetic class definitions
kos.Stream  = KineticStream
kos.Reactor = KineticReactor
kos.Trigger = KineticTrigger
kos.Token   = KineticToken

global.kos = module.exports = kos['default'] = kos.kos = kos
