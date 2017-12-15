'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Reactor extends Dataflow {

  get [Symbol.toStringTag]() { return `Reactor:${this.id}` }

  constructor(props) {
    super(props)
    this.state.reactions = new Set

    const { reactions = [] } = props
    reactions.forEach(reaction => this.add(reaction))
  }

  // ENABLE/DISABLE this Reactor
  enable()  { return this.link(this.parent) }
  disable() { return this.unlink(this.parent) }

  //--------------------------------------------------------
  // Reaction definitions and associations for this Reactor
  //--------------------------------------------------------
  add(reaction) {
    reaction = new Reaction(reaction, this)
    this.state.reactions.add(reaction)
    return reaction
  }
  pre(...keys) { return this.add({ requires: keys }) }
  in(...keys)  { return this.add({ inputs: keys }) }

  // finds a matching reaction based on ID from the local hierarchy
  find(id) { 
    if (this.parent) return this.parent.find(id)
    return this.reactions.find(x => x.id === id)
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

    if (this.enabled && stimulus.match(this.depends)) {
      debug(this.identity, '<--', topic)
      return true
    }
      
    return false
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

  get type()      { return Symbol.for('kos:reactor') }
  get identity()  { return this.parent ? this.parent.identity : this.id }
  get enabled()   { return this._flows.has(this.parent) }
  get passive()   { return this.state.passive === true }
  get reactions() { return Array.from(this.state.reactions) }
  get dataflows() { return this.flows.filter(x => x !== this.parent) }

  get cache() {
    if (!this._cache) {
      const { reactions, dataflows } = this
      const datacores = dataflows.map(x => x.core).filter(Boolean)
      const absorbs = [ 'consumes' ]
      if (this.passive) absorbs.push('absorbs')
      this._cache = {
        requires: extractUniqueKeys(reactions, 'requires'),
        inputs:   extractUniqueKeys(reactions, 'inputs'),
        outputs:  extractUniqueKeys(reactions, 'outputs'),
        consumes: extractUniqueKeys(reactions, 'inputs', 'requires'),
        absorbs:  extractUniqueKeys(datacores, ...absorbs),
        depends:  extractUniqueKeys(reactions.concat(datacores), 'depends')
      }
      this.once('adapt', flow => {
        this._cache = null
        this.parent.emit('adapt', this) // XXX - should we propagate flow instead?
      })
    }
    return this._cache
  }

  inspect() {
    const { 
      depends, requires, inputs, outputs, consumes, absorbs
    } = this
    return Object.assign(super.inspect(), {
      depends, requires, inputs, outputs, consumes, absorbs,
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

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, []).filter(Boolean)
  return Array.from(new Set(keys))
}

module.exports = Reactor

