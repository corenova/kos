'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Reactor extends Dataflow {

  get [Symbol.toStringTag]() { return `Reactor:${this.id}` }

  constructor(props) {
    super(props)
    const { reactions = [] } = props
    reactions.forEach(t => this.add(t))
  }

  // ENABLE/DISABLE this Reactor
  enable()  { 
    if (!this.enabled) {
      this.link(this.parent)
      this.enabled = true
    }
    return this
  }
  disable() { 
    if (this.enabled) {
      this.unlink(this.parent)
      this.enabled = false
    }
    return this
  }

  // overload Dataflow.save
  save(state, opts={}) {
    const { feed = false } = opts
    super.save(...arguments)
    if (feed && state) {
      debug(this.identity, `save feed: ${Object.keys(state)}`)
      for (let k of Object.keys(state))
        this.feed(k, state[k])
    }
    return this
  }

  //--------------------------------------------------------
  // Reaction definitions and associations for this Reactor
  //--------------------------------------------------------
  add(reaction) {
    new Reaction(reaction).join(this)
    return this
  }

  pre(...keys) { return new Reaction({ requires: keys }).join(this) }
  in(...keys)  { return new Reaction({ inputs: keys }).join(this) }

  contains(id) {
    if (this.id === id) return true
    if (this.reactions.some(x => x.id === id)) return true
    return false
  }

  // finds a matching reaction based on ID from the local hierarchy
  find(id) {
    if (this.id === id) return this
    return this.reactions.find(x => x.id === id)
  }

  pass(passive=false) { this.props.passive = passive; return this }

  filter(stimulus) {
    const { parent } = this
    const { topic } = stimulus

    // we trace the flow of transitions on the STIMULUS
    let flows = []
    if (parent.seen(stimulus)) {
      // from external flow
      this.notify && flows.push('accept')
      if (stimulus.match(this.inputs.concat(this.requires))) {
        debug(this.identity, '<==', topic)
        // update the stimulus that it's been accepted by this reactor
        this.mark(stimulus, true)
        if (this.notify) {
          if (stimulus.match(this.consumes))
            flows.push('consume')
          if (stimulus.match(this.absorbs))
            flows.push('absorb')
        }
      } else {
        if (this.notify) {
          flows.push('reject')
          this.emit('flow', stimulus, flows)
        }
        //debug(this.identity, 'XXX', topic)
        if (topic !== 'error') {
          this.emit('reject', stimulus)
          return false
        }
      }
    } else { 
      // from internal flow
      if (topic === 'error') return true

      if (this.notify) {
        flows.push('feedback')
        stimulus.match(this.consumes) ? flows.push('consume') : flows.push('reject')
      }
      if (stimulus.match(this.absorbs)) {
        debug(this.identity, '<->', topic)
        parent.mark(stimulus, true) // prevent external propagation
        this.notify && flows.push('absorb')
      } else if (stimulus.match(this.outputs)) {
        debug(this.identity, '==>', topic)
        this.notify && flows.push('produce')
      } else {
        // unhandled side-effect byproduct
        debug(this.identity, '<--', topic)
        this.passive || this.mark(stimulus, true) // prevent external propagation
        this.notify && flows.push('byproduct')
      }
      this.notify && this.emit(topic, stimulus.value)
    }

    // execute the reactions
    for (let reaction of this.reactions) {
      try { reaction(stimulus) }
      catch (e) { this.error(e) }
    }
    this.notify && this.emit('flow', stimulus, flows)
    return true
  }

  get enabled()  { return this.props.enabled === true }
  set enabled(v) { this.props.enabled = Boolean(v) }

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

  get type()    { return Symbol.for('kos:reactor') }
  get passive() { return this.props.passive === true }
  get active()  { return this.enabled && (this.parent ? this.parent.active : true) }
  get notify()  { return this.listenerCount('flow') > 0 }

  get cache() {
    if (!this._cache) {
      let reactions = [], dataflows = []
      for (let [ id, flow ] of this.flows) {
        if (flow === this.parent) continue
        if (flow instanceof Reaction)
          reactions.push(flow)
        else
          dataflows.push(flow)
      }
      this._cache = {
        reactions, dataflows, 

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
        absorbs:  extractUniqueKeys(dataflows, 'inputs', 'absorbs') 
      }
      this.once('adapt', flow => {
        this._cache = null
        //debug(this.identity, 'adapting to flow', flow.identity)
        this.emit('adapt', this) // XXX - should we propagate flow instead?
      })
    }
    return this._cache
  }

  inspect() {
    return Object.assign(super.inspect(), {
      passive:   this.passive,
      requires:  this.requires,
      inputs:    this.inputs,
      outpus:    this.outputs,
      consumes:  this.consumes,
      absorbs:   this.absorbs,
      reactions: this.reactions.map(x => x.inspect()),
      dataflows: this.dataflows.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      passive:   this.passive,
      enabled:   this.enabled,
      reactions: this.reactions.map(x => x.toJSON()),
      dataflows: this.dataflows.map(x => x.toJSON())
    })
  }
}

delegate(Reactor.prototype, 'cache')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')
  .getter('absorbs')
  .getter('reactions')
  .getter('dataflows')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, [])
  return Array.from(new Set(keys))
}

module.exports = Reactor

