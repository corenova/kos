'use strict';

const debug = require('debug')('kos:behavior');
const delegate = require('delegates');

const Interface = require('./interface');
const Pulse = require('./pulse');

class Behavior extends Interface {

  get [Symbol.toStringTag]() { return `Behavior:${this.uri}` }
  get type() { return Symbol.for('kos:behavior') }

  get state() { return this.get() }

  constructor(schema, model) {
    super(schema, model)
    this.model.on('update', prop => {
      let { path, content } = prop
      if (prop === m) return
      debug(`${this} feed on update to ${path} for:`, content)
      const pulse = new Pulse(`${path}`, this).add(content)
      this.inflow.write(pulse)
      this.outflow.write(pulse)
    })
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values))
    return this
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse;
    const match = this.in(topic)
    if (match) {
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          prop.do(data)
          break;
        default: prop.merge(data, { force: true, suppress: true })
        }
      }
    }
    return super.incoming(pulse)
  }
  join(parent) {
    if (!parent) throw this.error("must provide valid 'parent' argument")
    if (parent instanceof Behavior) return super.join(parent)
    
    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
}

module.exports = Behavior

