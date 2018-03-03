'use strict';

const debug = require('debug')('kos:persona')
const delegate = require('delegates')
const uuid = require('uuid')
const Yang = require('yang-js')

const Interface = require('./interface')
const Reaction = require('./reaction')
const Pulse = require('./pulse')

const kState  = Symbol.for('state')
const kSchema = Symbol.for('schema')
const kModel  = Symbol.for('model')

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type()  { return Symbol.for('kos:persona') }
  get reactions() { return this.nodes.filter(x => x instanceof Reaction) }
  get personas()  { return this.nodes.filter(x => x instanceof Persona) }

  get state()    { return this[kModel].get() }
  set state(obj) { this[kModel].set(obj) }

  set schema(x)  { 
    super.schema = x

    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Persona schema must be an instance of Yang")
    this[kSchema] = x
    Object.preventExtensions(this)
    debug(`${this} applying schema`)
    x.apply(this) // apply schema to this
    //
    // XXX: Special handling of schema imports?
    //
    for (let y of x.import || [])
      new Persona(y).join(this)

    // TODO: handle schema change
    this.model = new Model(x)
  }

  constructor(schema, config) {
    super()
    this.schema = schema
    this.state  = config

    //
    // Make the Persona executable
    //
    let Kinetic = config => new this.constructor(this[kSchema], config)
    return Object.setPrototypeOf(Kinetic, this)
  }
  // Dataflow
  feed(key, ...values) { 
    return this.write(new Pulse(key, this).add(...values)) 
  }
  incoming(pulse) {
    const { topic, data } = pulse
    const match = this.in(topic)
    if (match) {
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          prop.do(data)
          break;
        default: prop.set(data)
        }
      }
    }
    return false
  }
  // Relationships
  add(node) {
    if (super.add(node)) {
      if (node instanceof Persona) this.chain(node)
      else if (node instanceof Reaction) {
        for (let n of this.nodes) n.chain(node)
        this.source && this.source.chain(node)
      }
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Persona) this.unchain(node)
      else if (node instanceof Reaction) {
        for (let n of this.nodes) n.unchain(node)
        this.source && this.source.unchain(node)
      }
      return true
    }
    return false
  }
  chain(node) {
    if (this === node) return this
    for (let t of this.reactions) node.chain(t)
    return this
  }
  unchain(node) {
    if (this === node) return this
    for (let t of this.reactions) node.unchain(t)
    return this
  }
  join(parent) {
    if (!parent) throw new Error("must provide valid 'parent' argument")
    if (parent instanceof Synapse) return super.join(parent)
    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
  inspect() {
    const { label, uri, summary, reactions, personas } = this
    return Object.assign({ label, uri, summary }, super.inspect(), {
      reactions, personas
    })
  }
}

delegate(Persona.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .method('lookup')

delegate(Persona.prototype, kModel)
  .method('in')
  .method('get')
  .method('set')

module.exports = Persona

