'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')
const path = require('path');
const Yang = require('yang-js')

const Neural = require('./neural')
const Pulse = require('./pulse')
const Context = require('./context')

const kState    = Symbol.for('kos:reaction:state')
const kSchema   = Symbol.for('kos:reaction:schema')
const kDepends  = Symbol.for('kos:reaction:depends')
const kConsumes = Symbol.for('kos:reaction:consumes')
const kProduces = Symbol.for('kos:reaction:produces')

class Reaction extends Neural.Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  get label() { return this.datakey }
  get uri()   { return this.datapath }
  get state() { return this[kState] }
    
  get enabled() { return Array.from(this.depends).every(this.has.bind(this)) }
  get ready()   { return Array.from(this.consumes).every(this.has.bind(this)) }
  get context() {
    let ctx = Object.create(Context)
    ctx.actor = this
    ctx.queue = new Map
    return ctx
  }
  get depends() {
    if (!this[kDepends]) this[kDepends] = new Set
    return this[kDepends]
  }
  get consumes() {
    if (!this[kConsumes]) this[kConsumes] = new Set
    return this[kConsumes]
  }
  get produces() {
    if (!this[kProduces]) this[kProduces] = new Set
    return this[kProduces]
  }
  
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Reaction schema must be an instance of Yang")
    this[kSchema] = x
    x.apply(this) // apply schema to this
    // TODO: handle schema change
  }
  set depends(x) {
    const features = [].concat(x)
    for (let feature of features)
      feature.binding && this.set(feature, feature.binding())
    this[kDepends] = new Set(features)
  }
  set consumes(x) { this[kConsumes] = new Set([].concat(x)) }
  set produces(x) { this[kProduces] = new Set([].concat(x)) }
  
  constructor(schema) {
    super({ objectMode: true })
    this[kState] = new Map 
    this.schema = schema
  }
  //
  // Reaction Processing
  //
  use(key) {
    return this.get(this.lookup('feature', key))
  }
  activate(pulse, done) {
    if (!this.absorb(pulse)) return done()
    
    const { context, consumes, binding } = this
    const ts = new Date
    const inputs = Array.from(consumes)
    const idx  = inputs.indexOf(pulse.schema)
    const args = inputs.map(k => this.get(k)).concat(context)
    
    // TODO: clear the local state for input triggers?
    debug(`${this} ƒ(${inputs.map(x => x.tag)}) call ${pulse.size} time(s)`)
    context.trigger = pulse

    // Since token may have multiple outputs generated, we collect
    // all "send" operations and "compress" them into bulk token.
    for (let data of pulse.values) {
      args[idx] = data
      try { binding.apply(context, args) }
      catch (e) { e.origin = this; debug(e); this.error(e); }
    }
    context.flush()
    
    // clear transient reaction triggers
    for (let t of consumes)
      consumes.sticky || this.delete(t)
    debug(`${this} took ${new Date - ts}ms`)
    done()
  }
  absorb(pulse) {
    if (!(pulse instanceof Pulse))
      throw this.error('Reaction can only absorb Pulse objects')
    
    if (pulse.tagged(this)) return false
    else pulse.tag(this)

    const { topic, schema, data } = pulse
    if (data === null || typeof data === 'undefined') { 
      this.delete(schema)
      return false 
    }
    if (this.depends.has(schema)) {
      this.set(schema, data)
      return false
    }
    if (!this.enabled) return false
    if (!this.consumes.has(schema)) return false
    
    debug(`${this} <= ${topic}`)
    this.set(schema, data);
    return this.ready
  }
  join(parent) {
    if (parent instanceof Neural.Link) return super.join(parent)
    // join as a regular property of the parent
    // yeah, its hackish for compat with YANG
    // debug(`${this} join ${parent.constructor.name}`)
    // const get = () => this
    // get.bound = { content: this }
    // Object.defineProperty(parent, this.datakey, { 
    //   get, enumerable: true
    // })
    return parent
  }
  push(topic, ...values) {
    let pulse = new Pulse(topic, this).add(...values)
    if (this.produces.has(pulse.schema)) super.push(pulse)
    else this.error(`${pulse} is not one of output pulses`)
  }
  log(topic, ...args) {
    this.emit('log', new Pulse(topic, this).add(...args))
  }
  inspect() {
    const { label, uri, depends, consumes, produces } = this
    return Object.assign(super.inspect(), {
      label, uri, 
      depends:  Array.from(depends), 
      consumes: Array.from(consumes), 
      produces: Array.from(produces)
    })
  }
}

delegate(Reaction.prototype, kState)
  .method('get')
  .method('set')
  .method('has')
  .method('delete')

delegate(Reaction.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .getter('binding')
  .method('bind')
  .method('locate')
  .method('lookup')

module.exports = Reaction
