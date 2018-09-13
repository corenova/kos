'use strict';

const debug = require('debug')('kos:agent')
const merge = require('deepmerge')

const Persona = require('./persona')
const Pulse = require('./pulse');

class Agent extends Persona {

  get [Symbol.toStringTag]() { return `Agent:${this.uri}` }
  get type()  { return Symbol.for('kos:agent') }
  get nodes() { return this.layers.filter(l => l instanceof Persona) }

  constructor(schema, state) {
    super(schema, state)
  }
  use(schema, state=this.state) {
    return new Persona(schema, state).join(this)
  }
  join(parent) {
    if (!parent) throw this.error("must provide valid 'parent' argument")
    if (parent instanceof Agent) return super.join(parent)
    
    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
}

module.exports = Agent

