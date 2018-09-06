'use strict';

const debug    = require('debug')('kos:state')
const delegate = require('delegates')

const Dataflow = require('./dataflow')

class StateMachine extends Dataflow {
  get [Symbol.toStringTag]() { return `StateMachine:${this.id}` }

  get type()  { return Symbol.for('kos:state') }
  get label() { return this.id }
  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }

  // State Machine parent/child relationships
  get parent()  { return this.prop('parent') }
  set parent(x) { 
    if (!(x instanceof Dataflow)) return
    const parent = this.prop('parent')
    if (parent == x) return
    if (parent) this.unlink(parent)

    this.prop('parent', x)
    this.feed('kos:parent', x)
    x && x.link(this)
  }

  get children()  { return this.prop('children') || this.prop('children', new Set) }
  set children(x) { this.prop('children', new Set(x)) }

  set requires(keys) { this.prop('requires', new Set(keys)) }
  set inputs(keys)   { this.prop('inputs',   new Set(keys)) }
  set outputs(keys)  { this.prop('outputs',  new Set(keys)) }

  constructor(spec={}) {
    if (spec instanceof StateMachine) {
      spec = spec.inspect()
      delete spec.id
    }
    super(spec)
    
    this.props = new Map
    this.table = new Map
    
    const names = Object.keys(spec)
    'requires' in names || names.push('requires')
    'inputs'   in names || names.push('inputs')
    'outputs'  in names || names.push('outputs')

    for (let k of names) {
      try { this[k] = spec[k] }
      catch(e) { }
    }
    //debug(`${this} created`)
  }

  clone() { return new this.constructor(this) }

  save(state, emit=true) {
    if (typeof state === "object") {
      const keys = Object.keys(state)
      let diff = false
      for (let k of keys) {
        if (this.has(k) && 
            this.get(k) === state[k]) {
          continue
        }
        diff = true
        this.set(k, state[k])
      }
      if (emit) this.emit("save", state)
    }
    return this
  }

  prop(name, value) {
    if (arguments.length === 2) {
      if (value === null) this.props.delete(name)
      else this.props.set(name, value)
    }
    return this.props.get(name)
  }

  join(target) {
    if (!(target instanceof StateMachine))
      throw new Error("[join] can only join other StateMachines", target)
    this.parent = target
    return this
  }
  leave(target=this.parent) {
    if (!(target instanceof StateMachine))
      throw new Error("[leave] can only leave other StateMachines", target)
    if (this.parent !== target) return this
    this.parent = null
    return this
  }

  // accept pulse if ALL conditions are met:
  // 1. pulse is one of its inputs to cause trigger
  // 2. all inputs satisfied
  filter(pulse) {
    const { topic, data } = pulse

    if (data === null || typeof data === 'undefined') { 
      this.delete(topic); return false 
    }

    // if (pulse.match(this.variables)) {
    //   this.set(topic, data)
    //   this.adapt(pulse)
    //   return false
    // }

    if (!pulse.match(this.consumes)) return false

    this.set(topic, data)
    this.mark(pulse, true)
    return true
  }
  pipe(flow) {
    if (!this.children.has(flow)) {
      super.pipe(flow) 
      this.children.add(flow)
      this.adapt(flow)
    } else {
      debug(this.identity, this.children)
      this.warn("cannot pipe a flow already in local mapping", flow)
    }
    return flow
  }
  unpipe(flow) {
    if (this.children.has(flow)) {
      super.unpipe(flow)
      this.children.delete(flow)
      this.adapt(flow)
    }
    return null
  }
                 
  clear(...keys) {
    arguments.length ? 
      keys.forEach(this.delete.bind(this)) :
      this.inputs.forEach(this.delete.bind(this))
    return this
  }

  log() {
    const token = super.log(...arguments)
    this.parent && this.parent.log(token)
  }

  adapt(x) {
    this.prop('cache', null)
    this.parent && this.parent.adapt(x)
  }

  inspect() {
    const { id, type, label, purpose, requires, inputs, outputs, schema, state } = this
    return {
      id, type, label, purpose, requires, inputs, outputs, schema, state
    }
  }

  toJSON() {
    const { id, type, label, purpose, requires, inputs, outputs, schema, parent } = this
    return {
      id, label, purpose, requires, inputs, outputs, type: Symbol.keyFor(type), parent: parent ? parent.id : undefined
    }
  }

  resolve(key) {
    let match
    try { match = this.schema.locate(key) }
    catch (e) { }
    if (!match) return key
    return match.datapath
  }

  get cache() {
    if (this.prop('cache')) return this.prop('cache')

    let requires = Array.from(this.prop('requires')).map(this.resolve.bind(this))
    let inputs   = Array.from(this.prop('inputs')).map(this.resolve.bind(this))
    let outputs  = Array.from(this.prop('outputs')).map(this.resolve.bind(this))
    let consumes = requires.concat(inputs).filter((v,i,a)=>a.indexOf(v)==i)

    return this.prop('cache', { 
      requires, inputs, outputs, consumes 
    })
  }
}

delegate(StateMachine.prototype, 'cache')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')

delegate(StateMachine.prototype, 'table')
  .method('has')
  .method('set')
  .method('get')
  .method('delete')

module.exports = StateMachine
