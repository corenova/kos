var kos = require('./lib/core')

// expose class definitions
kos.Stream  = require('./lib/stream')
kos.Reactor = require('./lib/reactor')
kos.Essence = require('./lib/essence')

global.kos = module.exports = kos['default'] = kos.kos = kos
