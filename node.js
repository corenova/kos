'use strict'

const KineticStream  = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticTrigger = require('./lib/trigger')

const kos = new KineticReactor({
  name: 'kos',
  purpose: 'reactions to kinetic object streams',
  passive: true,
  triggers: [
    { inputs: 'reactor',  handler: fuseReactor },
    { inputs: 'reactors', handler: fuseReactors }
  ]
})

function fuseReactor(reactor)   { this.parent.load(reactor) }
function fuseReactors(reactors) { this.parent.load(...reactors) }

// expose Kinetic class definitions
kos.Stream  = KineticStream
kos.Reactor = KineticReactor
kos.Trigger = KineticTrigger

global.kos = module.exports = kos['default'] = kos.kos = kos
