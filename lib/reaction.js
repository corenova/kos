'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')
const Yang = require('yang-js')

const { kState, kSource, kSchema, kBounds } = require('./common')
const { Synapse, Neuron } = require('./neural')

const Context = require('./context')

class Reaction extends Neuron {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}` }
  get type()  { return Symbol.for('kos:reaction') }
  get label() { return this.datakey }
  get uri()   { return this.datapath }
  get ready() { return Array.from(this.consumes).every(this.has.bind(this)) }
  get context() {
    let ctx = Object.create(Context)
    ctx[kSource] = this
    ctx.queue = new Map
    return ctx
  }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Reaction schema must be an instance of Yang")
    this[kSchema] = x
    x.apply(this) // apply schema to this
    // TODO: handle schema change
  }
  set bounds(x={}) {
    const {
      depends  = new Map,
      requires = new Set,
      triggers = new Set,
      consumes = new Set,
      produces = new Set,
    } = x
    this[kBounds] = { depends, requires, triggers, consumes, produces }
  }

  constructor(schema) {
    super()
    this[kState] = new Map 
    this.schema = schema
  }
  //
  // Reaction Processing
  //
  activate(pulse) {
    if (this.absorb(pulse) && this.ready) {
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
        //debug(data)
        args[idx] = data
        try { binding.apply(context, args) }
        catch (e) { e.origin = this; debug(e); this.error(e); }
      }

      context.flush()
      debug(`${this} took ${new Date - ts}ms`)
    }
  }
  absorb(pulse) {
    const { topic, schema, data } = pulse
    if (data === null || typeof data === 'undefined') { 
      this.delete(schema)
      return false 
    }
    debug(`${this} absorb ${topic}?`)
    if (this.requires.has(schema)) {
      this.set(schema, data)
      return false
    }
    if (Array.from(this.requires).every(this.has.bind(this))) {
      if (this.triggers.has(schema)) {
        this.set(schema, data)
        return true
      }
    }
    return false
  }
  /* CHAIN/UNCHAIN

   Chaining is used for creating data pipelines.
   
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
  chain(node) {
    if (this === node) return this
    if (node instanceof Reaction) {
      this.connect(node)
      node.connect(this)
    } else throw new Error("sorry, you can only chain Reactions")
    return this
  }
  unchain(node) {
    if (node instanceof Reaction) {
      this.disconnect(node)
      node.disconnect(this)
    } else throw new Error("sorry, you can only unchain Reactions")
    return this
  }
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

delegate(Reaction.prototype, kBounds)
  .getter('depends')
  .getter('requires')
  .getter('triggers')
  .getter('consumes')
  .getter('produces')

module.exports = Reaction
