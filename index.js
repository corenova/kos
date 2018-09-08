const { Persona, Interface, Reaction, Context, Pulse } = require('./lib')

const schema = require('./kinetic-object-swarm')
const kos = new Persona(schema)

kos.Persona   = Persona
kos.Interface = Interface
kos.Reaction  = Reaction
kos.Context   = Context
kos.Pulse     = Pulse

global.kos = module.exports = kos['default'] = kos.kos = kos
