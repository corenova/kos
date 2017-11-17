'use strict';

const debug = require('debug')('kos:dataflow')
const delegate = require('delegates')

const Stream   = require('./stream')
const Reaction = require('./reaction')

// default value for maximum number of embedded dataflows within the Dataflow
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const KINETIC_MAX_FLOWS = 30

class Dataflow extends Stream {

  get [Symbol.toStringTag]() { return `Dataflow:${this.label}` }

  constructor(props) {
    if (typeof props === 'string') 
      props = { label: props }

    if (!props.label) throw new Error("must supply 'label' to create a new Dataflow")

    super(props)

    const { 
      enabled = true, 
      dataflows = [], 
      reactions = [] } = props

    dataflows.forEach(r => this.load(r))
    reactions.forEach(t => this.add(t))
    enabled && this.enable()
    debug(this.identity, 'new', this.id)

    // return an executable Dataflow (instead of pure Object)
    let Kinetic = state => this.clone(state, { feed: true })
    return Object.setPrototypeOf(Kinetic, this)
  }

  create() { return new Dataflow(...arguments) }

  desc(purpose='')    { this.props.purpose = purpose; return this }
  pass(passive=false) { this.props.passive = passive; return this }

  use(flow, state) {
    let foo = this.create(flow).save(state).join(this)
    return this
  }
  remove(flow) {
    if (dataflow instanceof Dataflow) dataflow.leave(this)
    return this
  }

  // ENABLE/DISABLE this dataflow
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

  // overload Dataflow.save
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

  //--------------------------------------------------------
  // Reaction definitions and associations for this Dataflow
  //--------------------------------------------------------
  add(reaction) {
    new Reaction(reaction).join(this)
    return this
  }

  pre(...keys) { return new Reaction({ requires: keys }).join(this) }
  in(...keys)  { return new Reaction({ inputs: keys }).join(this) }

  // LINK/UNLINK additional flows into the Dataflow core
  link(flow) {
    this.core.pipe(flow); flow.pipe(this.core);
    return this; 
  }
  unlink(flow) { 
    this.core.unpipe(flow); flow.unpipe(this.core); 
    return this; 
  }

  //------------------------------------------------
  // CORE DATAFLOW (dynamically created when needed)
  //------------------------------------------------
  get core() {
    if (!this._core) {
      const { maxFlows = KINETIC_MAX_FLOWS } = this.props
      this._core = new Stream({
        maxListeners: maxFlows,
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
    if (this.reactions.some(x => x.id === id)) return true
    if (this.dataflows.some(x => x.contains(id))) return true
    return false
  }

  find(id) {
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const dataflow of this.dataflows) {
      match = dataflow.find(id)
      if (match) return match
    }
    return
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Dataflow
  //----------------------------------------------

  get type()    { return Symbol.for('kos:dataflow') }
  get label()   { return this.props.label }
  get purpose() { return this.props.purpose }
  get passive() { return this.props.passive === true }
  get enabled() { return this.props.enabled === true }
  get active()  { return this.enabled && (this.parent ? this.parent.active : true) }
  get notify()  { return this.listenerCount('flow') > 0 }

  get cache() {
    if (!this._cache) {
      let dataflows = [], reactions = [], streams = []
      for (let flow of this.core.flows) {
        if (flow.id === this.id) continue
        if (flow instanceof Dataflow)
          dataflows.push(flow)
        else if (flow instanceof Stream)
          streams.push(flow)
      }
      this._cache = {
        dataflows, reactions, streams, 

        requires: (() => {
          let flows = reactions.concat(dataflows)
          return extractUniqueKeys(flows, 'requires')
        }).call(this),
        
        inputs: (() => {
          let flows = this.passive ? reactions.concat(dataflows) : reactions
          return extractUniqueKeys(flows, 'inputs', 'requires')
        }).call(this),

        outputs:  extractUniqueKeys(reactions, 'outputs'),
        consumes: extractUniqueKeys(reactions, 'inputs', 'requires'),
        absorbs:  extractUniqueKeys(dataflows, 'inputs') 
      }
      this.core.once('adapt', flow => {
        debug(this.identity, "clearing cache")
        this._cache = null
        this.emit('adapt', this) // XXX - should we propagate flow instead?
      })
    }
    return this._cache
  }

  inspect() {
    return Object.assign(super.inspect(), {
      label:     this.label,
      purpose:   this.purpose,
      passive:   this.passive,
      requires:  this.requires,
      dataflows: this.dataflows.map(x => x.inspect()),
      reactions: this.reactions.map(x => x.inspect()),
      streams:   this.streams.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      label:     this.label,
      purpose:   this.purpose,
      passive:   this.passive,
      requires:  this.requires,
      dataflows: this.dataflows.map(x => x.toJSON()),
      reactions: this.reactions.map(x => x.toJSON()),
      inputs:    this.inputs,
      outputs:   this.outputs
    })
  }
}

delegate(Dataflow.prototype, 'cache')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')
  .getter('absorbs')
  .getter('reactions')
  .getter('dataflows')
  .getter('streams')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, [])
  return Array.from(new Set(keys))
}

module.exports = Dataflow

