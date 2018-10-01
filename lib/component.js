'use strict';

const debug = require('debug')('kos:component');
const delegate = require('delegates');
const path = require('path');
const equal = require('deep-equal');
const merge = require('deepmerge');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter')
const Pulse = require('./pulse');

const kModel = Symbol.for('kos:model')
const kSchema = Symbol.for('kos:schema')
  
class Component extends Neural.Network {

  get [Symbol.toStringTag]() { return `Component:${this.uri}` }
  get type() { return Symbol.for('kos:component') }
  get name() { return this.datakey }
  get uri()  { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Component schema must be an instance of Yang");
    if (!(x.kind === 'kos:component'))
      throw this.error(`Component schema must be a kos:component, not ${x.kind}`);

    this[kSchema] = x;
    x.apply(this);
    // TODO: handle schema change event
  }
  
  constructor(schema, state={}) {
    super({
      objectMode: true,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    })
    this.schema = schema;
    this.state  = state;

    // make Component executable
    let KineticComponent = state => this.clone(state)
    return Object.setPrototypeOf(KineticComponent, this)
  }
  clone(state={}) {
    debug(`${this} cloning with`, this.state)
    return new this.constructor(this.schema, this.state).save(state, false)
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values))
    return this
  }
  save(state, emit=true) {
    if (typeof state === "object") {
      debug(`${this} saving new state for: ${Object.keys(state)}`)
      const arrayMerge = (d,s,o) => s
      const keys = Object.keys(state)
      const prev = this.state
      let diff = false
      for (let k of keys) {
        if (!equal(prev[k], state[k])) {
          diff = true
          break;
        }
      }
      if (diff) {
        this.state = merge(prev, state, { arrayMerge })
        if (emit) this.emit("save", this.state)
      }
    }
    return this
  }
  incoming(pulse) {
    const { topic, schema } = pulse
    const pass = this.consumes.has(schema)
    debug(`${this} <- ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema } = pulse
    const pass = this.produces.has(schema)
    debug(`${this} -> ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  join(parent) {
    if (!parent) throw this.error("must provide valid 'parent' argument")
    if (parent instanceof Neural.Network) return super.join(parent)

    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
  error() {
    let err = super.error(...arguments)
    this.root.emit('error', err)
    return err
  }
  inspect() {
    const { id, type, name, uri, summary, inputs, hiddens, outputs, orphans } = this
    return {
      id, type, name, uri, summary, inputs, hiddens, outputs, orphans
    }
  }
}

delegate(Component.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('prefix')
  .getter('description')
  .getter('tag')
  .getter('kind')
  .method('lookup')
  .method('locate')

module.exports = Component

