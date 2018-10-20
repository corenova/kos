/**
 * @fileoverview Persona
 * @author saintkepha (Peter Lee)
 */

'use strict';

const debug = require('debug')('kos:persona');
const delegate = require('delegates');
//const Yang = require('yang-js');

const Interface = require('./interface');

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }

  /**
   * @param {Yang} schema
   * @param {Object} config
   * @constructor
   */
  constructor(schema, config) {
    super(schema)
    this.model = schema(config)
  }
  use(uri) {
    let schema = this.locate(uri)
    return this.nodes.find(x => x.schema === schema)
  }
  feed(topic, ...values) {
    this.write(this.make(topic, ...values))
    return this
  }
  incoming(pulse) {
    const { topic, schema, origin } = pulse
    this.activate(pulse)
    return super.incoming(pulse)
  }
  outgoing(pulse) {
    const pass = super.outgoing(pulse)
    switch (pulse.kind) {
    case 'action':
    case 'rpc':
      return pass && pulse.pending
    default:
      return pass
    }
  }
}

module.exports = Persona

