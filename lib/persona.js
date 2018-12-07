/**
 * @fileoverview Persona
 * @author saintkepha (Peter Lee)
 */

'use strict';

const debug = require('debug')('kos:persona');
const delegate = require('delegates');

const Store = require('yang-js').Store;
const Interface = require('./interface');
const kStore = Symbol.for('yang:store')

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }

  get schema() { return super.schema }
  set schema(x) {
    this[kStore] = undefined
    super.schema = x
    this[kStore] = new Store(this.name).add(x)
  }
  get store() { return this[kStore] }

  use(schema) {
    this.store.add(schema)
    return new Interface(schema).join(this)
  }
  load(config) {
    this.feed('kos:store', this.store.set(config))
    return this
  }
  activate(pulse) {
    const { topic, data, schema, origin } = pulse
    if (this.store && schema.node) {
      const match = this.in(topic)
      if (!match) return false
      
      debug(`${this} <<< ${topic}`)
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          prop.do(data)
            .then(output => this.feed(prop.path+"/output", output))
            .catch(this.error.bind(prop))
          break;
        default:
          prop.merge(data, { force: true })
        }
      }
      return true
    }
    return false
  }
  incoming(pulse) {
    const processed = this.activate(pulse)
    return processed ? false : super.incoming(pulse)
  }
  outgoing(pulse) {
    const { schema, origin } = pulse
    const processed = origin instanceof Interface ? false : this.activate(pulse)
    if (processed) {
      switch (schema.kind) {
      case 'action':
      case 'rpc':
        return false
      }
    }
    return super.outgoing(pulse)
  }
}

delegate(Persona.prototype, kStore)
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

module.exports = Persona

