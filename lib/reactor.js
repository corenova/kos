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
    if (options instanceof KineticReactor) {
      options = options.inspect()
      debug(options.name, 'cloning')
    }
    if (typeof options === 'string') 
      options = { name: options }

    if (!options.name) throw new Error("must supply 'name' to create a new KineticReactor")

    super(options)

    let { 
      name, purpose, reactors=[], triggers=[], maxReceivers=KINETIC_MAX_RECEIVERS
    } = options

    this._name    = name
    this._purpose  = purpose
    this._reactors = new Map
    this._triggers = new Set

    // CORE REACTOR
    this.core = new KineticStream({
      maxListeners: maxReceivers,
      filter: (token) => {
        // we track the flow of transitions on the TOKEN
        let flow = []
        if (this.seen(token)) {
          // from external flow
          flow.push('accept')
          if (token.match(this.inputs) || token.match(this.requires)) {
            debug(this.identity, '<==', token.key)
            // update the token that it's been accepted into this flow
            this.mark(token, true)
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
          token.match(this.inputs) ? flow.push('consume') : flow.push('reject')
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
            this.mark(token) // prevent external propagation
          }
          if (token.key !== 'error') 
            this.emit(token.key, token.value)
        }
        this.emit('flow', token, flow)
        return true
      }
    })
    this.pipe(this.core).pipe(this)

    // NOTE: can't use this.load here since arguments may be simple
    // JSON objects
    this.loadReactor(...reactors)
    this.loadTrigger(...triggers)

    // save a reference to this reactor in global KOS object
    kos.register(this)
    debug(this.identity, 'new', this.id)
  }

  desc(description='') {
    this._purpose = description
    return this
  }

  // Load KineticStream(s) into current Reactor
  //
  // Loading extends the Reactor with additional receivers (such as
  // Reactors and Triggers) that can process tokens accepted into the
  // Reactor CORE.
  //
  // KineticTriggers will handle externally accepted and internally
  // produced tokens
  //
  // KineticReactors will only handle internally produced tokens
  // (other than tokens it requires)
  load(...streams) {
    for (const stream of streams) {
      if (!(stream instanceof KineticStream)) {
        throw new Error(`${this.identity}: must supply KineticStream to load`)
      }
      if (stream instanceof KineticReactor) this.loadReactor(stream)
      else if (stream instanceof KineticTrigger) this.loadTrigger(stream)
      else this.core.pipe(stream).pipe(this.core)
    }
    return this
  }

  loadReactor(...reactors) {
    for (let reactor of reactors) {
      reactor = new KineticReactor(reactor).join(this)
      this._reactors.set(reactor.name, reactor)
      this.core.pipe(reactor).pipe(this.core)
    }
    return this
  }

  loadTrigger(...triggers) {
    for (let trigger of triggers) {
      trigger = new KineticTrigger(trigger).join(this)
      this._triggers.add(trigger)
      this.core.pipe(trigger).pipe(this.core)
    }
    return this
  }

  unload(...streams) {
    for (const stream of streams) {
      if (stream instanceof KineticReactor) this._reactors.delete(stream.name)
      else if (stream instanceof KineticTrigger) this._triggers.delete(stream)
      this.core.unpipe(stream).unpipe(this.core)
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

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get identity() {
    let parent = this.state.get('parent')
    return parent ? parent.identity+'/'+this.name : this.name
  }

  get type() { return Symbol.for('kinetic.reactor') }

  get name()     { return this._name }
  get purpose()  { return this._purpose }
  get triggers() { return Array.from(this._triggers) }
  get reactors() { return Array.from(this._reactors.values()) }

  get requires() { return extractUniqueKeys(this.triggers.concat(this.reactors), 'requires') }
  get inputs()   { return extractUniqueKeys(this.triggers, 'inputs', 'requires') }
  get outputs()  { return extractUniqueKeys(this.triggers, 'outputs') }
  get absorbs()  { return extractUniqueKeys(this.reactors, 'inputs') }

  inspect() {
    return Object.assign(super.inspect(), {
      name:     this._name,
      purpose:  this._purpose,
      requires: this.requires,
      reactors: this.reactors.map(x => x.inspect()),
      triggers: this.triggers.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      name:     this._name,
      purpose:  this._purpose,
      requires: this.requires,
      reactors: this.reactors.map(x => x.toJSON()),
      triggers: this.triggers.map(x => x.toJSON())
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

