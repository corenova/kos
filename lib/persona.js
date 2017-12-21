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

    const { state } = this
    state.label = label
    state.purpose = purpose
    state.passive = passive

    // make the Persona executable (instead of pure Object)
    let Kinetic = state => this.clone(state)
    let self = Object.setPrototypeOf(Kinetic, this)

    // the Reactor shares the same "state" with this Persona
    this.core = new Reactor({ enabled, state, reactions }, self)
    personas.forEach(r => self.load(r))

    debug(this.identity, '@', this.id)
    return self
  }

  create() { return new Persona(...arguments) }

  desc(purpose='') { this.state.purpose = purpose; return this }
  pass(x=false)    { this.state.passive = Boolean(x); return this }

  load(flow, state) {
    this.create(flow).save(state).join(this)
    return this
  }
  unload(flow) {
    if (flow instanceof Dataflow) flow.leave(this)
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
      return stimulus.match(this.outputs)
    } else {
      return stimulus.match(this.inputs)
    }
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Persona
  //----------------------------------------------

  get type()     { return Symbol.for('kos:persona') }
  get label()    { return this.state.label }
  get purpose()  { return this.state.purpose }
  get passive()  { return this.state.passive === true }

  get inputs()   { 
    let inputs = this.consumes.concat(this.depends)
    if (this.passive) inputs.push(...this.absorbs)
    return inputs
  }
  get outputs()  { return this.core.outputs.concat('error') }
  get personas() { return this.core.dataflows.filter(x => x instanceof Persona) }

  inspect() {
    const { label, purpose, passive, enabled } = this
    return Object.assign(super.inspect(), { 
      label, purpose, passive, enabled,
      personas:  this.personas.map(x => x.inspect()),
      reactions: this.reactions.map(x => x.inspect())
    })
  }

  toJSON() {
    const { label, purpose, passive, enabled, personas } = this
    return Object.assign(super.toJSON(), {
      label, purpose, passive, enabled, 
      personas: this.personas.map(x => x.toJSON()),
      reactions: this.reactions.map(x => x.toJSON())
    })
  }
}

delegate(Persona.prototype, 'core')
  .method('enable')
  .method('disable')
  .method('link')
  .method('unlink')
  .method('pre')
  .method('in')
  .method('io')
  .getter('enabled')
  .getter('depends')
  .getter('consumes')
  .getter('absorbs')
  .getter('reactions')

module.exports = Persona

