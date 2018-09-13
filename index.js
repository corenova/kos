const { Agent, Persona, Interface, Reaction, Context, Pulse } = require('./lib')

const schema = require('./kinetic-object-swarm')
const kos = new Agent(schema)

kos.Agent     = Agent
kos.Persona   = Persona
kos.Interface = Interface
kos.Reaction  = Reaction
kos.Context   = Context
kos.Pulse     = Pulse

global.kos = module.exports = kos['default'] = kos.kos = kos
