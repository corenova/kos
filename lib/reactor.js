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
    this._reactions = new Set
    reactions.forEach(reaction => this.add(reaction))
  }

  // ENABLE/DISABLE this Reactor
  enable()  { return this.link(this.parent) }
  disable() { return this.unlink(this.parent) }

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
    reaction = new Reaction(reaction, this)
    this._reactions.add(reaction)
    return reaction
  }
  pre(...keys) { return this.add({ requires: keys }) }
  in(...keys)  { return this.add({ inputs: keys }) }

  contains(id) {
    if (this.id === id) return true
    if (this.reactions.some(x => x.id === id)) return true
    return this.datacores.some(x => x.contains(id))
  }

  // finds a matching reaction based on ID from the local hierarchy
  find(id) {
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const core of this.datacores) {
      match = core.find(id)
      if (match) return match
    }
    return null
  }

  filter(stimulus) {
    const { topic } = stimulus

    if (stimulus.match(this.consumes)) {
      debug(this.identity, '<==', topic)
      // update the stimulus that it's been consumed by this reactor
      this.mark(stimulus, true)
      // execute the reactions
      for (let reaction of this.reactions) {
        try { reaction(stimulus) }
        catch (e) { this.error(e) }
      }
    }

    // always passthrough errors 
    if (topic === 'error') return true

    if (stimulus.match(this.outputs)) {
      debug(this.identity, '==>', topic)
      return true
    }

    if (stimulus.match(this.absorbs)) {
      debug(this.identity, '<->', topic)
      return true
    }

    if (stimulus.match(this.depends)) {
      debug(this.identity, '<--', topic)
      return true
    }
      
    return false
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

  get type()     { return Symbol.for('kos:reactor') }
  get identity() { return this.parent ? this.parent.identity : this.id }
  get enabled()  { return this._flows.has(this.parent) }
  get passive()  { return this.parent ? this.parent.passive : false }
  get cache() {
    if (!this._cache) {
      const reactions = Array.from(this._reactions)
      const dataflows = this.flows.filter(x => x !== this.parent)
      const datacores = dataflows.map(x => x.core).filter(Boolean)
      const absorbs = [ 'consumes' ]
      if (this.passive) absorbs.push('absorbs')
      this._cache = {
        reactions, dataflows, datacores,
        requires: extractUniqueKeys(reactions, 'requires'),
        inputs:   extractUniqueKeys(reactions, 'inputs'),
        outputs:  extractUniqueKeys(reactions, 'outputs'),
        consumes: extractUniqueKeys(reactions, 'inputs', 'requires'),
        absorbs:  extractUniqueKeys(datacores, ...absorbs),
        depends:  extractUniqueKeys(reactions.concat(datacores), 'depends')
      }
      this.once('adapt', flow => {
        this._cache = null
        //debug(this.identity, 'adapting to flow', flow.identity)
        this.parent.emit('adapt', this) // XXX - should we propagate flow instead?
      })
    }
    return this._cache
  }

  inspect() {
    const { 
      requires, inputs, outputs, consumes, absorbs
    } = this
    return Object.assign(super.inspect(), {
      requires, inputs, outputs, consumes, absorbs,
      reactions: this.reactions.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      reactions: this.reactions.map(x => x.toJSON())
    })
  }
}

delegate(Reactor.prototype, 'cache')
  .getter('depends')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')
  .getter('absorbs')
  .getter('reactions')
  .getter('dataflows')
  .getter('datacores')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, []).filter(Boolean)
  return Array.from(new Set(keys))
}

module.exports = Reactor

