'use strict';

const debug = require('debug')('kos:reactor')
const delegate = require('delegates')

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
    this._cache    = null

    // CORE REACTOR
    this.core = new KineticStream({
      maxListeners: maxReceivers,
      filter: token => {
        // we track the flow of transitions on the TOKEN
        let flow = []
        if (this.seen(token)) {
          // from external flow
          this.notify && flow.push('accept')
          if (token.match(this.inputs.concat(this.requires))) {
            debug(this.identity, '<==', token.key)
            // update the token that it's been accepted into this flow
            this.mark(token, true)
            if (this.notify) {
              if (token.match(this.consumes))
                flow.push('consume')
              if (token.match(this.absorbs))
                flow.push('absorb')
            }
          } else {
            if (this.notify && !token.match(['error','warn','info','debug'])) {
              flow.push('reject')
              this.emit('flow', token, flow)
            }
            //debug(this.identity, 'XXX', token.key)
            return false
          }
        } else { 
          // from internal flow
          if (token.match(['error','warn','info','debug'])) return true
          if (this.notify) {
            flow.push('feedback')
            token.match(this.consumes) ? flow.push('consume') : flow.push('reject')
          }
          if (token.match(this.absorbs)) {
            debug(this.identity, '<->', token.key)
            this.mark(token, true) // prevent external propagation
            this.notify && flow.push('absorb')
          } else if (token.match(this.outputs)) {
            debug(this.identity, '==>', token.key)
            this.notify && flow.push('produce')
          } else {
            // unhandled side-effect byproduct
            debug(this.identity, '<--', token.key)
            this.notify && flow.push('byproduct')
            this.passive || this.mark(token) // prevent external propagation
          }
          this.notify && this.emit(token.key, token.value)
        }
        this.notify && this.emit('flow', token, flow)
        return true
      }
    })
    
    reactors.forEach(r => this.load(r))
    triggers.forEach(t => this.add(t))
    enabled && this.enable()
    debug(this.identity, 'new', this.id)

    // return an executable Reactor (instead of pure Object)
    let KineticInstance = (tokens = []) => this.create(this).inject(...tokens)
    let self = Object.setPrototypeOf(KineticInstance, this)
    self.name = this.name
    return self
  }

  create() { return new KineticReactor(...arguments) }

  desc(description='') { this._purpose = description; return this }
  pass(enable=false)   { this._passive = enable; return this }

  load(reactor) {
    new KineticReactor(reactor).join(this)
    return this
  }
  unload(reactor={}) {
    if (reactor.parent === this)
      reactor.leave(this)
    return this
  }

  add(trigger) {
    new KineticTrigger(trigger).join(this)
    return this
  }

  // Entry point to define triggers handled by this KOS
  //
  // returns: new KineticReactor
  pre(...keys) { return new KineticTrigger({ requires: keys }).join(this) }
  in(...keys)  { return new KineticTrigger({ inputs: keys }).join(this) }

  // ENABLE/DISABLE this reactor
  enable()  { 
    if (!this.enabled) {
      this._enabled = true
      super.link(this.core)
    }
    return this
  }
  disable() { 
    if (this.enabled) {
      this._enabled = false
      super.unlink(this.core)
    }
    return this
  }

  // INJECT a token directly into the Reactor's CORE
  // *convenience function*
  inject() { this.core.feed(...arguments); return this }

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

  // LINK/UNLINK additional streams into the reactor's core
  link(stream) {
    this.core.pipe(stream); stream.pipe(this.core);
    return this; 
  }
  unlink(stream) { 
    this.core.unpipe(stream); stream.unpipe(this.core); 
    return this; 
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get type()    { return Symbol.for('kinetic.reactor') }
  get name()    { return this._name }
  get purpose() { return this._purpose }
  get passive() { return this._passive }
  get enabled() { return this._enabled }
  get active()  { return this._enabled && (this.parent ? this.parent.active : true) }
  get notify()  { return this.listenerCount('flow') > 0 }

  get cache() {
    if (!this._cache) {
      let reactors = [], triggers = [], streams = []
      for (let stream of this.core._streams) {
        if (stream === this) continue
        if (stream instanceof KineticReactor)
          reactors.push(stream)
        else if (stream instanceof KineticTrigger)
          triggers.push(stream)
        else if (stream instanceof KineticStream)
          streams.push(stream)
      }
      this._cache = {
        reactors: reactors,
        triggers: triggers,
        streams:  streams,

        requires: (() => {
          let streams = triggers.concat(reactors)
          return extractUniqueKeys(streams, 'requires')
        }).call(this),
        
        inputs: (() => {
          let streams = this.passive ? triggers.concat(reactors) : triggers
          return extractUniqueKeys(streams, 'inputs', 'requires')
        }).call(this),

        outputs:  extractUniqueKeys(triggers, 'outputs'),
        consumes: extractUniqueKeys(triggers, 'inputs', 'requires'),
        absorbs:  extractUniqueKeys(reactors, 'inputs') 
      }
      this.core.once('dirty', stream => {
        debug(this.identity, "clearing cache")
        this._cache = null
        //this.state.delete('cache')
        this.emit('dirty', this) // XXX - should we propagate stream?
      })
    }
    return this._cache
  }

  inspect() {
    return Object.assign(super.inspect(), {
      name:     this.name,
      purpose:  this.purpose,
      passive:  this.passive,
      requires: this.requires,
      reactors: this.reactors.map(x => x.inspect()),
      triggers: this.triggers.map(x => x.inspect()),
      streams:  this.streams.map(x => x.inspect())
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

delegate(KineticReactor.prototype, 'cache')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')
  .getter('absorbs')
  .getter('triggers')
  .getter('reactors')
  .getter('streams')

function extractUniqueKeys(streams=[], ...names) {
  let keys = streams.reduce((a, stream) => {
    return a.concat(...names.map(x => stream[x]))
  }, [])
  return Array.from(new Set(keys))
}

module.exports = KineticReactor

