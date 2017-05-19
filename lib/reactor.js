'use strict';

const debug = require('debug')('kos:reactor')

const KineticStream  = require('./stream')
const KineticTrigger = require('./trigger')

// default value for maximum number of embedded streams within the Reactor
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const KINETIC_MAX_RECEIVERS = 30

class KineticReactor extends KineticStream {

  get [Symbol.toStringTag]() { return 'KineticReactor'+':'+this.name }

  constructor(options) {
    if (typeof options === 'string') 
      options = { name: options }

    if (!options.name) throw new Error("must supply 'name' to create a new KineticReactor")

    super(options)

    let { 
      name, purpose, passive = false, enabled = true,
      reactors = [], triggers = [], 
      maxReceivers = KINETIC_MAX_RECEIVERS
    } = options

    this._name     = name
    this._purpose  = purpose
    this._passive  = passive
    this._enabled  = false
    this._reactors = new Map
    this._triggers = new Set

    // CORE REACTOR
    this.core = new KineticStream({
      maxListeners: maxReceivers,
      filter: token => {
        // we track the flow of transitions on the TOKEN
        let flow = []
        if (this.seen(token)) {
          // from external flow
          flow.push('accept')
          if (token.match(this.inputs) || token.match(this.requires)) {
            debug(this.identity, '<==', token.key)
            // update the token that it's been accepted into this flow
            this.mark(token, true)
            if (token.match(this.consumes))
              flow.push('consume')
            if (token.match(this.absorbs))
              flow.push('absorb')
          } else {
            if (token.match(['error','warn','info','debug'])) return false
            flow.push('reject')
            this.emit('flow', token, flow)
            return false
          }
        } else { 
          // from internal flow
          if (token.match(['error','warn','info','debug'])) return true

          flow.push('feedback')
          token.match(this.consumes) ? flow.push('consume') : flow.push('reject')
          if (token.match(this.absorbs)) {
            debug(this.identity, '<->', token.key)
            this.mark(token, true) // prevent external propagation
            flow.push('absorb')
          } else if (token.match(this.outputs)) {
            debug(this.identity, '==>', token.key)
            flow.push('produce')
          } else {
            // unhandled side-effect byproduct
            debug(this.identity, '<--', token.key)
            flow.push('byproduct')
            this.passive || this.mark(token) // prevent external propagation
          }
          if (token.key !== 'error') 
            this.emit(token.key, token.value)
        }
        this.emit('flow', token, flow)
        return true
      }
    })
    this.load(...reactors)
    this.add(...triggers)
    enabled && this.enable()
    debug(this.identity, 'new', this.id)
  }

  create() { return new KineticReactor(...arguments) }

  desc(description='') { this._purpose = description; return this }
  pass(enable=false)   { this._passive = enable; return this }

  _load(reactor) {
    // XXX - need to prevent reactor.id that already exists
    const exists = this._reactors.get(reactor.name)
    if (exists === reactor) return exists
    exists && this.unlink(exists)
    this._reactors.set(reactor.name, reactor)
    this.link(reactor)
    return reactor.join(this) // return newly loaded reactor instance
  }
  load(...reactors) {
    const loaded = []
    for (let reactor of reactors) {
      reactor = this.create(reactor)
      loaded.push(this._load(reactor))
    }
    return this
  }
  unload(reactor) {
    if (this._reactors.has(reactor.name)) {
      reactor.pause()
      this.unlink(reactor)
      this._reactors.delete(reactor.name)
    }
    return this
  }

  link(stream)   { this.core.pipe(stream);   stream.pipe(this.core);   return this; }
  unlink(stream) { this.core.unpipe(stream); stream.unpipe(this.core); return this; }

  enable()  { 
    if (!this.enabled) {
      this._enabled = true
      this.pipe(this.core)
      this.core.pipe(this)
    }
    return this; 
  }
  disable() { 
    if (this.enabled) {
      this._enabled = false
      this.unpipe(this.core)
      this.core.unpipe(this)
    }
    return this
  }

  // Chain KineticStream(s) from/to the current Reactor
  //
  // Chaining is a convenience method to emulate following logic:
  //
  // this.pipe(StreamA).pipe(StreamB).pipe(StreamC).pipe(this)
  // 
  // Instead of attaching to the Reactor CORE as in the `load()`
  // case, it simply establishes a data pipeline of outputs from the
  // Reactor to have a control feedback loop across one more more
  // additional KineticStreams. Basically, the collective outputs from
  // the *chained* Reactors are piped back as new inputs into each of
  // the respective Reactor streams (including the current Reactor).
  chain(...streams) {
    // TODO: should we validate that the streams are instances of KineticStream?
    let tail = streams.reduce(((a, b) => a.pipe(b)), this)
    tail && tail.pipe(this)
    return this
  }

  add(...triggers) {
    for (let trigger of triggers) {
      trigger = new KineticTrigger(trigger).join(this)
      this._triggers.add(trigger)
      this.core.pipe(trigger).pipe(this.core)
    }
    return this
  }

  // Entry point to define triggers handled by this KOS
  //
  // returns: new KineticReactor
  in(...keys)  { return this.trigger(keys) }

  // Primary method for expressing I/O bound KineticTrigger for KineticReactor
  // 
  // trigger('my/input','my/output').bind(fn)
  // trigger(['a','b','c'],'d').bind(fn) 
  // trigger('hello','world',fn) -- returns KineticReactor
  //
  // returns: a new KineticTrigger or current KineticReactor (if func supplied)
  trigger(inputs, outputs, func) {
    let trigger = new KineticTrigger({
      inputs:  inputs,
      outputs: outputs,
      handler: func
    })
    return func ? this.include(trigger) : trigger.join(this)
  }

  contains(id) {
    if (this.triggers.some(x => x.id === id)) return true
    if (this.reactors.some(x => x.contains(id))) return true
    return false
  }

  find(id) {
    if (this.id === id) return this
    let match = this.triggers.find(x => x.id === id)
    if (match) return match
    for (const reactor of this.reactors) {
      match = reactor.find(id)
      if (match) return match
    }
    return
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get identity() {
    let parent = this.parent
    return parent ? parent.identity+'/'+this.name : this.name
  }

  get type() { return Symbol.for('kinetic.reactor') }

  get name()    { return this._name }
  get purpose() { return this._purpose }
  get passive() { return this._passive }
  get enabled() { return this._enabled }
  get active()  { return this._enabled && (this.parent ? this.parent.active : true) }

  get triggers() { return Array.from(this._triggers) }
  get reactors() { return Array.from(this._reactors.values()) }

  get requires() { 
    //if (!this.enabled) return []
    return extractUniqueKeys(this.triggers.concat(this.reactors), 'requires') }
  get inputs()   { 
    //if (!this.enabled) return []
    let streams = this.passive ? this.triggers.concat(this.reactors) : this.triggers
    return extractUniqueKeys(streams, 'inputs', 'requires') 
  }
  get outputs()  { return extractUniqueKeys(this.triggers, 'outputs') }
  get consumes() { return extractUniqueKeys(this.triggers, 'inputs', 'requires') }
  get absorbs()  { return extractUniqueKeys(this.reactors, 'inputs') }

  inspect() {
    return Object.assign(super.inspect(), {
      name:     this.name,
      purpose:  this.purpose,
      passive:  this.passive,
      requires: this.requires,
      reactors: this.reactors.map(x => x.inspect()),
      triggers: this.triggers.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      name:     this.name,
      purpose:  this.purpose,
      passive:  this.passive,
      requires: this.requires,
      reactors: this.reactors.map(x => x.toJSON()),
      triggers: this.triggers.map(x => x.toJSON()),
      inputs:   this.inputs,
      outputs:  this.outputs
    })
  }

}

module.exports = KineticReactor

function extractUniqueKeys(streams=[], ...names) {
  let keys = streams.reduce((a, stream) => {
    return a.concat(...names.map(x => stream[x]))
  }, [])
  return Array.from(new Set(keys))
}

