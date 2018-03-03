'use strict';

const debug = require('debug')('kos:automata')
const delegate = require('delegates')
const Yang = require('yang-js')

const { Network } = require('./neural')
const Persona = require('./persona')

class Automata extends Network {

  use(schema) {
    let persona = this.personas.get(schema) || new Persona(schema)
    persona.join(this)
    return persona
  }
  add(node) {
    if (node instanceof Persona) return super.add(node)
    else {
      if (node instanceof Yang)
        throw this.error("did you mean to call .use(schema) instead?")
      else
        throw this.error("must provide Persona to add into Automata")
    }
  }
}

module.exports = Automata
