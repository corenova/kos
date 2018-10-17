'use strict';

const debug = require('debug')('kos:persona');
const delegate = require('delegates');
const Yang = require('yang-js');

const Interface = require('./interface');

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }

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
  absorb(pulse, opts={}) {
    const { topic, schema, data } = pulse
    const { force=true, suppress=true } = opts
    if (this.model && schema.node) {
      const match = this.in(topic)
      if (!match) return
      
      debug(`${this} <<< ${topic}`)
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          prop.do(data)
            .catch(this.error.bind(prop))
          break;
        default:
          prop.merge(data, { force, suppress })
        }
      }
    }
  }
  incoming(pulse) {
    const { topic, schema, origin } = pulse
    this.absorb(pulse)
    return super.incoming(pulse)
  }
  outgoing(pulse) {
    const { topic, schema, origin } = pulse
    if (origin instanceof Interface) {
      // it's a model update triggered pulse
      // we route this up into the layer without trying to absorb it.
      this.inflow.push(pulse)
    } else {
      this.absorb(pulse)
    }
    return super.outgoing(pulse)
  }
}

module.exports = Persona

