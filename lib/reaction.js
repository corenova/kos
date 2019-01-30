'use strict';

const debug = require('./debug').extend('reaction');
const delegate = require('delegates');

const Node = require('./node');
const Context = require('./context');

const kSchema = Symbol.for('kos:schema');
const kState = Symbol.for('kos:state');
const kDepends = Symbol.for('kos:depends');

class Reaction extends Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  
  get state() { return this[kState] }
  get enabled() { return Array.from(this.depends).every(this.has.bind(this)) }
  get ready()   { return Array.from(this.consumes.keys()).every(this.has.bind(this)) }
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
  set depends(x=[]) {
    const features = [].concat(x)
    for (let feature of features)
      feature.binding && this.set(feature, feature.binding)
    this[kDepends] = new Set(features)
  }
  set active(x) { this._active = x; }
  get active()  { return this._active && (typeof this.binding === 'function') }

  constructor(schema) {
    super(schema);
    this[kState] = new Map 
  }
  //
  // Reaction Processing
  //
  use(key) {
    debug(`${this.uri} use feature '${key}' in [${Array.from(this.depends).map(d => d.datakey)}]`)
    let feature = this.get(this.lookup('feature', key))
    if (!feature)
      throw this.error(`unable to use feature '${key}' not found in depends`)
    return feature
  }
  activate(pulse, done) {
    if (!super.activate(pulse) || !this.absorb(pulse)) return done();
    
    const { context, consumes, binding } = this;
    const { queue } = context;
    const ts = new Date;
    const inputs = Array.from(consumes.keys());
    const idx  = inputs.indexOf(pulse.schema);
    const args = inputs.map(k => this.get(k)).concat(context);
    
    // TODO: clear the local state for input triggers?
    debug(`${this.uri} ƒ(${inputs.map(x => x.datakey)}) call ${pulse.size} time(s)`)
    context.trigger = pulse

    // Since token may have multiple outputs generated, we collect
    // all "send" operations and "compress" them into bulk token.
    for (let data of pulse.values) {
      args[idx] = data
      try { binding.apply(context, args) }
      catch (e) { context.error(e); }
    }
    // flush all values inside context.queue
    for (let [ topic, values ] of queue) {
      debug(`${this.uri} transmit ${topic} (${values.length})`)
      this.push(this.make(topic, ...values))
      queue.delete(topic)
    }
    delete context.queue;
    
    // clear transient reaction triggers
    for (let [schema, opts] of consumes)
      opts.persist || this.delete(schema)
    debug(`${this.uri} took ${new Date - ts}ms`)
    return done()
  }
  absorb(pulse) {
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

    // check if pulse data conforms to the consumes filter option
    const opts = this.consumes.get(schema)
    switch (opts.filter) {
    case 'object': if (Array.isArray(data)) return false;
      break;
    case 'array':  if (!Array.isArray(data)) return false;
      break;
    }
    debug(`${this.uri} <= ${topic}`)
    this.set(schema, data);
    return this.active && this.ready;
  }
  inspect() {
    return Object.assign(super.inspect(), {
      depends: Array.from(this.depends).map(x => x.datapath)
    });
  }
}

delegate(Reaction.prototype, kState)
  .method('get')
  .method('set')
  .method('has')
  .method('delete')

module.exports = Reaction
