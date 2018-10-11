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
const kPersists = Symbol.for('kos:persists')

class Reaction extends Neural.Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }
  
  get state() { return this[kState] }
  get enabled() { return Array.from(this.depends).every(this.has.bind(this)) }
  get ready()   { return Array.from(this.consumes).every(this.has.bind(this)) }
  get context() {
    let ctx = Object.create(Context)
    ctx.actor = this
    ctx.queue = new Map
    return ctx
  }
  get persists() {
    if (!this[kPersists]) this[kPersists] = new Set
    return this[kPersists]
  }
  get depends() {
    if (!this[kDepends]) this[kDepends] = new Set
    return this[kDepends]
  }
  set depends(x=[]) {
    const features = [].concat(x)
    for (let feature of features)
      feature.binding && this.set(feature, feature.binding)
    this[kDepends] = new Set(features)
  }
  
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Reaction schema must be an instance of Yang")
    this[kSchema] = x
    x.apply(this) // apply schema to this
    // TODO: handle schema change
  }
  
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
    
    const { context, consumes, persists, binding } = this
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
      persists.has(schema) || this.delete(schema)
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
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse)
    else this.error(`${pulse.topic} is not one of produced schemas in ${this}`)
  }
  make(topic, ...values) {
    return new Pulse(topic, this).add(...values)
  }
  join(parent) {
    if (parent instanceof Neural.Layer) return super.join(parent);
    return parent
  }
  log(topic, ...args) {
    this.root.emit('log', this.make(topic, args));
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
