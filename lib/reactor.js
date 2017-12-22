'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Reactor extends Dataflow {

  get [Symbol.toStringTag]() { return `Reactor:${this.id}` }

  constructor(props, persona) {
    const { enabled = true, reactions = [] } = props

    super(props)
    this._reactions = new Set
    reactions.forEach(reaction => this.add(reaction))

    this.persona = persona
    this.enabled && this.enable()
  }

  // ENABLE/DISABLE this Reactor
  enable()  { return this.link(this.persona) }
  disable() { return this.unlink(this.persona) }

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

  // finds a matching reaction based on ID from the local hierarchy
  find(id) { 
    if (this.persona) return this.persona.find(id)
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
  get enabled()   { return this._flows.has(this.persona) }

  get reactions() { return Array.from(this._reactions) }
  get dataflows() { return this.flows.filter(x => x !== this.persona) }

  // called when state machine needs to be updated
  adapt(x) {
    const { reactions, dataflows } = this
    const requires = extractUniqueKeys(reactions, 'requires')
    const inputs   = extractUniqueKeys(reactions, 'inputs')
    const outputs  = extractUniqueKeys(reactions, 'outputs')
    this.props({ requires, inputs, outputs })
    super.adapt(x)

    const absorbs  = extractUniqueKeys(dataflows, 'accepts')
    const depends  = extractUniqueKeys(reactions.concat(dataflows), 'depends')
  }

  get cache() {
    if (!this._cache) {
      const { reactions, dataflows } = this
      // based on reactions
      const consumes = extractUniqueKeys(reactions, 'inputs', 'requires')

      const provides = outputs.concat('error')
      const accepts  = depends.concat(consumes)
      if (this.passive) accepts.push(...absorbs)
                                        
      this._cache = { 
        requires, inputs, outputs, consumes, absorbs, depends, provides, 
        accepts : uniqueKeys(accepts)
      }
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

delegate(Reactor.prototype, 'state')
  .getter('passive')
  .getter('depends')
  .getter('consumes')
  .getter('absorbs')
  .getter('accepts')
  .getter('provides')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, []).filter(Boolean)
  return uniqueKeys(keys)
}

function uniqueKeys(keys) {
  return Array.from(new Set(keys))
}

module.exports = Reactor

