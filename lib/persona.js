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
      personas = [], core = {} } = props

    if (!label) throw new Error("must supply 'label' to create a new Persona")

    // make the Persona executable (instead of pure Object)
    let Kinetic = state => this.clone(state)
    let self = Object.setPrototypeOf(Kinetic, this)

    this.props = { label, purpose, passive }
    this.core = new Reactor(core).join(self)
    enabled || this.disable()
    personas.forEach(r => this.load(r))

    debug(this.identity, '@', this.id)
    return self
  }

  create() { return new Persona(...arguments) }

  desc(purpose='') { this.props.purpose = purpose; return this }
  pass(x=false)    { this.props.passive = Boolean(x); return this }

  load(flow, state) {
    if (!this.contains(flow.id))
      this.create(flow).save(state).join(this.core)
    return this
  }
  unload(flow) {
    if (flow instanceof Persona) flow.leave(this.core)
    return this
  }

  filter(stimulus) {
    if (this.core.seen(stimulus)) {
      // produced by core reactor
      return this.passive || stimulus.match(this.outputs)
    }
    return this.passive || stimulus.match(this.inputs)
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Persona
  //----------------------------------------------

  get type()     { return Symbol.for('kos:persona') }
  get label()    { return this.props.label }
  get purpose()  { return this.props.purpose }
  get passive()  { return this.props.passive === true }
  get inputs()   { return this.core.consumes.concat('module/*') }
  get outputs()  { return this.core.outputs.concat('error') }
  get personas() { return this.core.dataflows.filter(x => x instanceof Persona) }

  inspect() {
    const { label, purpose, passive, enabled } = this
    return Object.assign(super.inspect(), { 
      label, purpose, passive, enabled,
      personas: this.personas.map(x => x.inspect()),
      core: this.core.inspect()
    })
  }

  toJSON() {
    const { label, purpose, passive, enabled, personas } = this
    return Object.assign(super.toJSON(), {
      label, purpose, passive, enabled, 
      personas: this.personas.map(x => x.toJSON()),
      core: this.core.toJSON()
    })
  }
}

delegate(Persona.prototype, 'core')
  .method('init')
  .method('enable')
  .method('disable')
  .method('pre')
  .method('in')
  .method('contains')
  .method('find')
  .getter('enabled')
  .getter('depends')

module.exports = Persona

