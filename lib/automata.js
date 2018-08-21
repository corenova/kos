'use strict';

const debug = require('debug')('kos:automata')
const delegate = require('delegates')
const Yang = require('yang-js')

const { Network } = require('./neural')
const Persona = require('./persona')
const Interface = require('./interface')

class Automata extends Network {

  get [Symbol.toStringTag]() { return `Automata` }
  get type() { return Symbol.for('kos:automata') }

  get personas() { return new Set(this.nodes.filter(x => x instanceof Persona)) }
  
  use(schema) {
    let persona = this.personas.has(schema) || new Persona(schema)
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
