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

    if (!props.label) throw new Error("must supply 'label' to create a new Persona")

    super(props)

    const { 
      enabled = true, 
      personas = [] } = props

    this.core = new Reactor(props).join(this)
    enabled || this.disable()
    personas.forEach(r => this.load(r))

    debug(this.parent)
    debug(this.identity, '@', this.id)

    // make the Persona executable (instead of pure Object)
    let Kinetic = state => this.clone(state)
    return Object.setPrototypeOf(Kinetic, this)
  }

  create() { return new Persona(...arguments) }

  desc(purpose='')    { this.props.purpose = purpose; return this }

  load(flow, state) {
    if (!this.contains(flow.id))
      this.create(flow).save(state).join(this.core)
    return this
  }
  unload(flow) {
    if (flow instanceof Persona) flow.leave(this)
    return this
  }

  contains(id) {
    if (this.id === id) return true
    return this.core.contains(id)
  }

  // finds a matching reaction based on ID from the local hierarchy
  find(id) {
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const flow of this.personas) {
      match = flow.find(id)
      if (match) return match
    }
    return null
  }

  filter(stimulus) {
    return this.passive || !stimulus.tags.get(this.core.id)
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Persona
  //----------------------------------------------

  get type()    { return Symbol.for('kos:persona') }
  get label()   { return this.props.label }
  get purpose() { return this.props.purpose }
  get passive() { return this.props.passive === true }
  get active()  { return this.enabled && (this.parent ? this.parent.active : true) }
  get notify()  { return this.listenerCount('flow') > 0 }

  inspect() {
    return Object.assign(super.inspect(), {
      label:     this.label,
      purpose:   this.purpose,
      passive:   this.passive,
      requires:  this.requires,
      personas:  this.personas.map(x => x.inspect()),
      reactions: this.reactions.map(x => x.inspect()),
      dataflows: this.dataflows.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      label:     this.label,
      purpose:   this.purpose,
      passive:   this.passive,
      requires:  this.requires,
      personas:  this.personas.map(x => x.toJSON()),
      reactions: this.reactions.map(x => x.toJSON()),
      inputs:    this.inputs,
      outputs:   this.outputs
    })
  }
}

delegate(Persona.prototype, 'core')
  .method('pre')
  .method('in')
  .method('contains')
  .method('find')
  .method('pass')
  .method('enable')
  .method('disable')
  .method('save')
  .getter('cache')
  .getter('passive')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, [])
  return Array.from(new Set(keys))
}

module.exports = Persona

