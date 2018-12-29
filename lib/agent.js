/**
 * @fileoverview Agent
 * @author saintkepha (Peter Lee)
 */

'use strict';

const debug = require('debug')('kos:agent');
const delegate = require('delegates');

const Store = require('yang-js').Store;
const Interface = require('./interface');
const kState = Symbol.for('kos:state')

class Agent extends Interface {

  get [Symbol.toStringTag]() { return `Agent:${this.uri}` }
  get type() { return Symbol.for('kos:agent') }
  get default() { return this }

  get schema() { return super.schema }
  set schema(x) {
    this[kState] = undefined
    super.schema = x
    this[kState] = new Store(this.name).add(x)
  }
  get state() { return this[kState] }

  create(schema) {
    return new Agent(schema)
  }
  use(schema) {
    this.state.add(schema)
    return new Interface(schema).join(this)
  }
  set(config) {
    this.feed('kos:store', this.state.set(config))
    return this
  }
  activate(pulse) {
    const { topic, data, schema, origin } = pulse
    if (this.state && schema.node) {
      const match = this.in(topic)
      if (!match) return false
      
      debug(`${this} <<< ${topic}`)
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          if (!prop.active) return false
          prop.do(data)
            .then(output => this.feed(prop.path+"/output", output))
            .catch(this.error.bind(prop))
          break;
        default:
          prop.merge(data, { force: true, actor: origin })
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

delegate(Agent.prototype, kState)
  .method('access')
  .method('in')
  .method('get')

module.exports = Agent

