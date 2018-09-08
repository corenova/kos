'use strict';

const debug = require('debug')('kos:interface')
const delegate = require('delegates')
const merge = require('deepmerge')
const uuid = require('uuid')
const Yang = require('yang-js')

const { kState, kSchema, kModel, kBounds } = require('./common')
const { Synapse } = require('./neural')
const Reaction = require('./reaction')
const Pulse = require('./pulse')
const Model = require('./model')

class Interface extends Synapse {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type()  { return Symbol.for('kos:interface') }
  get uri()   { return this.datakey }
  get label() { return this[kSchema].prefix ? this[kSchema].prefix.tag : this.tag }
  get summary() { return this[kSchema].description ? this[kSchema].description.tag : undefined }
  get interfaces() { return this.nodes.filter(x => x instanceof Interface) }
  get reactions() { return this.nodes.filter(x => x instanceof Reaction) }

  get state()    { return this[kModel].get() }
  set state(obj) { this[kModel].set(obj, { force: true, suppress: true }) }

  get model()  { return this[kModel] }
  set model(m) {
    // Feed updates to inflow & outflow
    m.on('update', prop => {
      let { path, content } = prop
      if (prop === m) return
      debug(`${this} feed on update to ${path} for:`, content)
      const pulse = new Pulse(`${path}`, this).add(content)
      this.inflow.write(pulse)
      this.outflow.write(pulse)
    })
    this[kModel] = m
  }
  get schema() { return this[kSchema] }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Interface schema must be an instance of Yang")
    this.model = new Model(x)
    this[kSchema] = x
    Object.preventExtensions(this)
    debug(`${this} applying schema...`)
    x.apply(this)

    for (let i of x.import || []) {
      new Interface(i.module).join(this)
    }
    debug(`${this} schema applied`)
    // TODO: handle schema change
  }
  constructor(schema, state) {
    super()
    this.schema = schema
    this.state  = state

    //
    // Make the Interface executable
    //
    let Kinetic = state => new this.constructor(this[kSchema], merge(this.state, state))
    return Object.setPrototypeOf(Kinetic, this)
  }
  feed(key, ...values) {
    this.write(new Pulse(key, this).add(...values))
    return this
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse
    const match = this.in(topic)
    debug(`${this} handle incoming pulse: ${topic} (${schema.tag})`)
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
    return true
  }
  // Relationships
  add(node) {
    if (super.add(node)) {
      if (node instanceof Interface) this.chain(node)
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
      if (node instanceof Interface) this.unchain(node)
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
    const { uri, label, summary, reactions, interfaces } = this
    return Object.assign({ uri, label }, super.inspect(), {
      summary, reactions, interfaces
    })
  }
}

delegate(Interface.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .method('lookup')
  .method('locate')

delegate(Interface.prototype, kModel)
  .method('in')
  .method('get')
  .method('set')

delegate(Interface.prototype, kBounds)
  .getter('consumes')
  .getter('produces')

module.exports = Interface

