'use strict';

const debug = require('debug')('kos:persona')
const merge = require('deepmerge')
const Behavior = require('./behavior')

class Persona extends Behavior {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }
  get behaviors() { return this.links.filter(x => x instanceof Behavior) }

  constructor(schema, model) {
    super(schema, model)

    // make Persona executable
    let Kinetic = state => this.clone(state)
    return Object.setPrototypeOf(Kinetic, this)
  }
  clone(state={}) {
    return new this.constructor(this.schema, merge(this.state, state))
  }
  use(schema, state=this.state) {
    return new Behavior(schema, state).join(this)
  }
}

module.exports = Persona

