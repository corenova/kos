'use strict'

const { Automata, Persona, Reaction, Interface, Transform } = require('./lib')

const kos = new Automata(require('./schema/kos'))

// expose main class definitions
kos.Automata  = Automata
kos.Persona   = Persona
kos.Interface = Interface
kos.Reaction  = Reaction
kos.Transform = Transform

global.kos = module.exports = kos['default'] = kos.kos = kos
