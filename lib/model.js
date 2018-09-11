'use strict';

const debug = require('debug')('kos:model');
const delegate = require('delegates');

const Interface = require('./interface');
const Pulse = require('./pulse');
const kCore = Symbol.for('kos:model:core')

class Model extends Interface {

  get [Symbol.toStringTag]() { return `Model:${this.uri}` }
  get type() { return Symbol.for('kos:model') }

  get core() { return this.schema[kCore] }
  get state() { return this.core.get() }
  set state(obj) {
    let m = this.schema.eval(obj)
    // Feed updates to inflow & outflow
    m.on('update', prop => {
      let { path, content } = prop
      if (prop === m) return
      debug(`${this} feed on update to ${path} for:`, content)
      const pulse = new Pulse(`${path}`, this).add(content)
      this.inflow.write(pulse)
      this.outflow.write(pulse)
    })
    this.schema[kCore] = m
  }

  constructor(schema, state) {
    super(schema)
    this.state = state
  }
  feed(key, ...values) {
    this.write(new Pulse(key, this).add(...values))
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
    if (parent instanceof Interface) return super.join(parent)
    
    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
}

delegate(Model.prototype, "core")
  .method('in')

module.exports = Model

