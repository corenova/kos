'use strict';

const debug = require('debug')('kos:persona')

const Interface = require('./interface')

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type()  { return Symbol.for('kos:persona') }
  
  use(schema) { return new Interface(schema).join(this) }
}

module.exports = Persona

