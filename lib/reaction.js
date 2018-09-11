'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')
const path = require('path');
const Yang = require('yang-js')

const { Synapse, Neuron } = require('./neural')
const Context = require('./context')
const kSchema = Symbol.for('kos:reaction:schema')
const kState  = Symbol.for('kos:reaction:state')
const kScope  = Symbol.for('kos:reaction:scope')

class Reaction extends Neuron {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  get label() { return this.datakey }
  get uri()   { return this.datapath }
  get ready() { return Array.from(this.consumes).every(this.has.bind(this)) }
  get context() {
    let ctx = Object.create(Context)
    ctx.actor = this
    ctx.queue = new Map
    return ctx
  }
  get schema() { return this[kSchema] }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Reaction schema must be an instance of Yang")
    this[kSchema] = x
    x.apply(this) // apply schema to this
    // TODO: handle schema change
  }
  set scope(x={}) {
    const {
      depends  = new Map,
      requires = new Set,
      triggers = new Set,
      consumes = new Set,
      produces = new Set,
    } = x
    this[kScope] = { depends, requires, triggers, consumes, produces }
  }

  constructor(schema) {
    super()
    this.schema = schema
    this[kState] = new Map 
  }
  //
  // Reaction Processing
  //
  activate(pulse) {
    if (this.absorb(pulse) && this.ready) {
      const { context, triggers, consumes, binding } = this
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
        catch (e) { console.error(e); e.origin = this; debug(e); this.error(e); }
      }
      
      context.flush()
      // clear transient trigger pulse states
      for (let t of triggers) this.delete(t)
      debug(`${this} took ${new Date - ts}ms`)
    }
  }
  absorb(pulse) {
    const { topic, schema, data } = pulse
    if (data === null || typeof data === 'undefined') { 
      this.delete(schema)
      return false 
    }
    if (this.consumes.has(schema)) {
      debug(`${this} <= ${topic}`)
      this.set(schema, data);
      return true
    }
    return false
  }
  /* isChainable

   Between Reactions, only compatible flows are piped to/from each
   other. For example, if Reaction A produces a topic that Reaction B
   consumes, a pipe between A -> B gets established. Similarly, if
   Reaction B produces a topic that Reaction A consumes, a pipe
   between B -> A gets established.

   The `chain` operation attempts to establish meaningful connection(s) 
   between two Reactions

   It is possible that two Reactions can form a closed-loop feedback
   relationship, although it is more common for closed-loop
   feedback to involve more Reactions.

   When an attempt is made to chain two incompatible Reactions, no
   pipe gets established between the Reactions.
  */
  isChainable(node) { 
    for (let output of this.produces)
      for (let input of node.consumes)
        if (output === input) return true
    return false 
  }
  connect(node) {
    if (node instanceof Reaction) {
      this.isChainable(node) && super.connect(node)
    } else super.connect(node)
  }
  disconnect(node) {
    if (node instanceof Reaction) {
      this.isChainable(node) && super.disconnect(node)
    } else super.disconnect(node)
  }
  join(parent) {
    if (!parent) throw new Error("must provide valid 'parent' argument")
    if (parent instanceof Synapse) return super.join(parent)
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
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse)
    else this.error(`${pulse} is not one of output pulses`)
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

delegate(Reaction.prototype, kScope)
  .getter('depends')
  .getter('requires')
  .getter('triggers')
  .getter('consumes')
  .getter('produces')

module.exports = Reaction
