'use strict';

const debug = require('debug')('kos:reactor')
const delegate = require('delegates')

const KineticStream  = require('./stream')
const KineticTrigger = require('./trigger')

// default value for maximum number of embedded streams within the Reactor
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const KINETIC_MAX_STREAMS = 30

class KineticReactor extends KineticStream {

  get [Symbol.toStringTag]() { return 'KineticReactor'+':'+this.name }

  constructor(props) {
    if (typeof props === 'string') 
      props = { label: props }

    if (!props.label) throw new Error("must supply 'label' to create a new KineticReactor")

    super(props)

    const { 
      enabled = true, 
      reactors = [], 
      triggers = [] } = props

    reactors.forEach(r => this.load(r))
    triggers.forEach(t => this.add(t))
    enabled && this.enable()
    debug(this.identity, 'new', this.id)

    // return an executable Reactor (instead of pure Object)
    let KineticInstance = state => this.clone(state, { feed: true })
    return Object.setPrototypeOf(KineticInstance, this)
  }

  create() { return new KineticReactor(...arguments) }

  desc(purpose='')    { this.props.purpose = purpose; return this }
  pass(passive=false) { this.props.passive = passive; return this }

  load(reactor, state) {
    let foo = this.create(reactor).save(state).join(this)
    return this
  }
  unload(reactor) {
    if (reactor instanceof KineticReactor) reactor.leave(this)
    return this
  }

  // ENABLE/DISABLE this reactor
  enable()  { 
    if (!this.enabled) {
      this.props.enabled = true
      super.link(this.core)
    }
    return this
  }
  disable() { 
    if (this.enabled) {
      this.props.enabled = false
      super.unlink(this.core)
    }
    return this
  }

  // overload Stream.save
  save(state, opts={}) {
    const { feed = false } = opts
    super.save(...arguments)
    if (feed && state) {
      debug(`${this.identity} save feed: ${Object.keys(state)}`)
      for (let k of Object.keys(state))
        this.core.feed(k, state[k])
    }
    return this
  }

  //-------------------------------------------------------
  // Trigger definitions and associations for this Reactor
  //-------------------------------------------------------
  add(trigger) {
    new KineticTrigger(trigger).join(this)
    return this
  }

  pre(...keys) { return new KineticTrigger({ requires: keys }).join(this) }
  in(...keys)  { return new KineticTrigger({ inputs: keys }).join(this) }

  // LINK/UNLINK additional streams into the reactor's core
  link(stream) {
    this.core.pipe(stream); stream.pipe(this.core);
    return this; 
  }
  unlink(stream) { 
    this.core.unpipe(stream); stream.unpipe(this.core); 
    return this; 
  }

  //------------------------------------------------
  // CORE REACTOR (dynamically created when needed)
  //------------------------------------------------
  get core() {
    if (!this._core) {
      const { maxStreams = KINETIC_MAX_STREAMS } = this.props
      this._core = new KineticStream({
        maxListeners: maxStreams,
        filter: token => {
          // we trace the flow of transitions on the TOKEN
          let flows = []
          if (this.seen(token)) {
            // from external flow
            this.notify && flows.push('accept')
            if (token.match(this.inputs.concat(this.requires))) {
              debug(this.identity, '<==', token.key)
              // update the token that it's been accepted into this flow
              this.mark(token, true)
              if (this.notify) {
                if (token.match(this.consumes))
                  flows.push('consume')
                if (token.match(this.absorbs))
                  flows.push('absorb')
              }
            } else {
              if (this.notify && !token.match(['error','warn','info','debug'])) {
                flows.push('reject')
                this.emit('flow', token, flows)
              }
              //debug(this.identity, 'XXX', token.key)
              return false
            }
          } else { 
            // from internal flow
            if (token.match(['error','warn','info','debug'])) return true
            if (this.notify) {
              flows.push('feedback')
              token.match(this.consumes) ? flows.push('consume') : flows.push('reject')
            }
            if (token.match(this.absorbs)) {
              debug(this.identity, '<->', token.key)
              this.mark(token, true) // prevent external propagation
              this.notify && flows.push('absorb')
            } else if (token.match(this.outputs)) {
              debug(this.identity, '==>', token.key)
              this.notify && flows.push('produce')
            } else {
              // unhandled side-effect byproduct
              debug(this.identity, '<--', token.key)
              this.notify && flows.push('byproduct')
              this.passive || this.mark(token) // prevent external propagation
            }
            this.notify && this.emit(token.key, token.value)
          }
          this.notify && this.emit('flow', token, flows)
          return true
        }
      })
    }
    return this._core
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

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

  get type()    { return Symbol.for('kinetic.reactor') }
  get label()   { return this.props.label }
  get purpose() { return this.props.purpose }
  get passive() { return this.props.passive === true }
  get enabled() { return this.props.enabled === true }
  get active()  { return this.enabled && (this.parent ? this.parent.active : true) }
  get notify()  { return this.listenerCount('flow') > 0 }

  get cache() {
    if (!this._cache) {
      let reactors = [], triggers = [], streams = []
      for (let stream of this.core._streams) {
        if (stream.id === this.id) continue
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
      this.core.once('adapt', stream => {
        debug(this.identity, "clearing cache")
        this._cache = null
        this.emit('adapt', this) // XXX - should we propagate stream instead?
      })
    }
    return this._cache
  }

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this.label,
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
      label:    this.label,
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

