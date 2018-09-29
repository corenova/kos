'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')
const path = require('path');
const Yang = require('yang-js')

const Neural = require('./neural')
const Pulse = require('./pulse')
const Context = require('./context')
const Channel = require('./channel')

const kState    = Symbol.for('kos:state')
const kSchema   = Symbol.for('kos:schema')
const kDepends  = Symbol.for('kos:depends')
const kConsumes = Symbol.for('kos:consumes')
const kProduces = Symbol.for('kos:produces')

class Reaction extends Neural.Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  get name()  { return this.datakey }
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
  set consumes(x) { this[kConsumes] = x instanceof Set ? x : new Set([].concat(x)) }
  set produces(x) { this[kProduces] = x instanceof Set ? x : new Set([].concat(x)) }
  
  constructor(schema) {
    super({ objectMode: true })
    this[kState] = new Map 
    this.schema = schema
  }
  //
  // Reaction Processing
  //
  use(key) {
    debug(`${this} use feature '${key}' in [${Array.from(this.depends).map(d => d.datakey)}]`)
    let feature = this.get(this.lookup('feature', key))
    if (!feature)
      throw this.error(`unable to use feature '${key}' not found in depends`)
    return feature
  }
  activate(pulse, done) {
    if (!this.absorb(pulse)) return done()
    
    const { context, consumes, binding } = this
    const ts = new Date
    const inputs = Array.from(consumes)
    const idx  = inputs.indexOf(pulse.schema)
    const args = inputs.map(k => this.get(k)).concat(context)
    
    // TODO: clear the local state for input triggers?
    debug(`${this} ƒ(${inputs.map(x => x.datakey)}) call ${pulse.size} time(s)`)
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
    for (let schema of consumes)
      schema.sticky || this.delete(schema)
    debug(`${this} took ${new Date - ts}ms`)
    done()
  }
  absorb(pulse) {
    if (!(pulse instanceof Pulse))
      throw this.error('Reaction can only absorb Pulse objects')

    if (!(typeof this.binding === 'function')) 
      throw this.error('missing function binding for this reaction')
    
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
    if (parent instanceof Neural.Layer) return super.join(parent)
    // join as a regular property of the parent?
    // yeah, its hackish for compat with YANG
    // debug(`${this} join ${parent.constructor.name}`)
    // const get = () => this
    // get.bound = { content: this }
    // Object.defineProperty(parent, this.datakey, { 
    //   get, enumerable: true
    // })
    return parent
  }
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse)
    else this.error(`${pulse} is not one of output schemas`)
  }
  create(topic, ...values) {
    return new Pulse(topic, this).add(...values)
  }
  log(topic, ...args) {
    this.root.emit('log', this.create(topic, args));
  }
  error() {
    let err = super.error(...arguments)
    this.root.emit('error', err)
    return err
  }
  inspect() {
    const { name, uri, depends, consumes, produces } = this
    return Object.assign(super.inspect(), {
      name, uri, 
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
