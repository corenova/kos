'use strict';

const debug = require('debug')('kos:persona')
const merge = require('deepmerge')
const Model = require('./model')

class Persona extends Model {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }
  get actors() { return this.routes.filter(x => x instanceof Model) }

  constructor(schema, state) {
    super(schema, state)

    // make Persona executable
    let Kinetic = state => this.clone(state)
    return Object.setPrototypeOf(Kinetic, this)
  }
  clone(state={}) {
    return new this.constructor(this.schema, merge(this.state, state))
  }
  use(schema, state=this.state) { return new Model(schema, state).join(this) }

  inspect() {
    const { id, type, uri, label, summary, actors } = this
    return {
      id, type, uri, label, summary, actors
    }
  }
}

module.exports = Persona

