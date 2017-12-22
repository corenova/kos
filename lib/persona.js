'use strict';

const debug    = require('debug')('kos:persona')
const delegate = require('delegates')

const Dataflow = require('./dataflow')
const Reactor  = require('./reactor')

// default value for maximum number of embedded dataflows within the Dataflow
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const KINETIC_MAX_FLOWS = 30

class Persona extends Dataflow {

  get [Symbol.toStringTag]() { return `Persona:${this.label}:${this.id}` }

  constructor(props) {
    if (typeof props === 'string') 
      props = { label: props }

    super(props)

    const { 
      label, purpose, passive = false, enabled = true, 
      personas = [], reactions = [] } = props

    if (!label) throw new Error("must supply 'label' to create a new Persona")

    this.props({ label, purpose, passive })

    // make the Persona executable (instead of pure Object)
    let Kinetic = state => this.clone(state)
    let self = Object.setPrototypeOf(Kinetic, this)

    const { state } = this
    // the Reactor shares the same "state" with this Persona
    this.core = new Reactor({ enabled, state, reactions }, self)
    personas.forEach(r => self.load(r))

    debug(this.identity, '@', this.id)
    return self
  }

  create() { return new Persona(...arguments) }

  desc(purpose='') { this.purpose = purpose; return this }
  pass(x=false)    { this.passive = Boolean(x); return this }

  load(flow, state) {
    this.create(flow).save(state).join(this)
    return this
  }
  unload(flow) {
    if (flow instanceof Persona) flow.leave(this)
    return this
  }

  join(persona) {
    if (!(persona instanceof Persona))
      throw new Error("[join] can only join other Personas", persona)
    
    if (this.parent == persona) return this
    if (this.parent) {
      this.unlink(this.parent)
    }
    this.parent = persona
    this.feed('parent', this.parent)
    persona.link(this)
    return this
  }
  
  leave(persona=this.parent) {
    if (!(persona instanceof Persona))
      throw new Error("[leave] can only leave other Personas", persona)
    if (this.parent === persona) {
      this.parent = null
      this.feed('parent', this.parent)
      persona.unlink(this)
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
        this.core.feed(k, state[k])
    }
    return this
  }

  contains(id) {
    if (this.id === id) return true
    if (this.reactions.some(x => x.id === id)) return true
    return this.personas.some(x => x.contains(id))
  }

  // finds a matching reaction based on ID from the local hierarchy
  find(id) {
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const persona of this.personas) {
      match = persona.find(id)
      if (match) return match
    }
    return null
  }

  filter(stimulus) {
    if (this.core.seen(stimulus)) {
      //debug(this.identity, 'produced', stimulus.topic, stimulus.match(this.outputs))
      // produced by core reactor
      return stimulus.match(this.provides)
    } else {
      return stimulus.match(this.accepts)
    }
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Persona
  //----------------------------------------------

  get type()     { return Symbol.for('kos:persona') }
  get personas() { return this.core.dataflows.filter(x => x instanceof Persona) }

  inspect() {
    const { label, purpose, passive, enabled, depends, accepts, provides } = this
    return Object.assign(super.inspect(), { 
      label, purpose, passive, enabled, 
      depends, accepts, provides,
      personas:  this.personas.map(x => x.inspect()),
      reactions: this.reactions.map(x => x.inspect())
    })
  }

  toJSON() {
    const { label, purpose, passive, enabled } = this
    return Object.assign(super.toJSON(), {
      label, purpose, passive, enabled, 
      personas:  this.personas.map(x => x.toJSON()),
      reactions: this.reactions.map(x => x.toJSON())
    })
  }
}

delegate(Persona.prototype, 'state')
  .getter('label')
  .access('purpose')
  .access('passive')
  .getter('depends')
  .getter('accepts')
  .getter('provides')

delegate(Persona.prototype, 'core')
  .getter('enabled')
  .getter('reactions')
  .method('enable')
  .method('disable')
  .method('link')
  .method('unlink')
  .method('pre')
  .method('in')
  .method('io')

module.exports = Persona

