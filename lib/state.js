'use strict';

const debug = require('debug')('kos:state')
const delegate = require('delegates')

const Dataflow = require('./dataflow')

const DynamicVariable = /^{(.+)}$/

class StateMachine extends Dataflow {
  get [Symbol.toStringTag]() { return `StateMachine:${this.id}` }

  get type()  { return Symbol.for('kos:state') }

  get map()     { return this.prop('map') || this.prop('map', new Map) }
  set map(data) { this.prop('map', new Map(data)) }

  get state() {
    let obj = Object.create(null)
    for (let [k,v] of this.map) obj[k] = v
    return obj
  }
  set state(obj) { this.init(obj) }

  get label()  { return this.prop('label') || this.id }
  set label(x) { this.prop('label', x) }

  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }

  // State Machine parent/child relationships
  get parent()  { return this.prop('parent') }
  set parent(x) { 
    const parent = this.prop('parent')
    if (parent == x) return
    if (parent) this.unlink(parent)

    this.prop('parent', x)
    this.feed('parent', x)
    x && x.link(this)
  }

  get children()  { return this.prop('children') || this.prop('children', new Set) }
  set children(x) { this.prop('children', new Set(x)) }

  set requires(keys) { this.prop('requires', new Set(keys)) }
  set inputs(keys)   { this.prop('inputs',   new Set(keys)) }
  set outputs(keys)  { this.prop('outputs',  new Set(keys)) }

  constructor(props={}) {
    if (props instanceof StateMachine) {
      props = props.inspect()
      delete props.id
    }
    super(props)

    this.props = new Map

    const names = Object.keys(props)
    'requires' in names || names.push('requires')
    'inputs'   in names || names.push('inputs')
    'outputs'  in names || names.push('outputs')

    for (let k of names) {
      try { this[k] = props[k] }
      catch(e) { }
    }
    //debug(`${this} created`)
  }

  clone() { return new this.constructor(this) }

  init(state) {
    this._init = state // remember it?
    this.map.clear()
    this.save(state, false)
    return this
  }

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

  get cache() {
    if (this.prop('cache')) return this.prop('cache')

    let requires = Array.from(this.prop('requires') || [])
    let inputs   = Array.from(this.prop('inputs') || [])
    let outputs  = Array.from(this.prop('outputs') || [])
    let consumes
    let variables = [].concat(requires,inputs,outputs).reduce((a,key) => {
      let match = key.match(DynamicVariable)
      if (match) a.push(match[1])
      return a
    }, [])
    requires = requires.map(this.resolve.bind(this))
    inputs   = inputs.map(this.resolve.bind(this))
    outputs  = outputs.map(this.resolve.bind(this))
    consumes = requires.concat(inputs)

    return this.prop('cache', { 
      variables, requires, inputs, outputs, consumes 
    })
  }

  fill(target, keys) {
    target = this.prop(target)
    if (!target) return this
    for (let key of keys)
      typeof key === 'string' && target.add(key)
    this.adapt(target)
    return this
  }

  pre(...keys) { return this.fill('requires', keys) }
  in(...keys)  { return this.fill('inputs', keys) }
  out(...keys) { return this.fill('outputs', keys) }

  // accept stimulus if ALL conditions are met:
  // 1. stimulus is one of its inputs to cause trigger
  // 2. all inputs satisfied
  filter(stimulus) {
    const { topic, data } = stimulus

    if (data === null || typeof data === 'undefined') { 
      this.delete(topic); return false 
    }

    if (stimulus.match(this.variables)) {
      this.set(topic, data)
      this.adapt(stimulus)
      return false
    }

    if (!stimulus.match(this.consumes)) return false

    this.set(topic, data)
    this.mark(stimulus, true)
    return true
  }
  pipe(flow) {
    if (!this.children.has(flow)) {
      super.pipe(flow) 
      this.children.add(flow)
      this.adapt(flow)
    } else {
      debug(this.identity, this.children)
      this.error("cannot pipe a flow already in local mapping", flow)
    }
    return flow
  }
  unpipe(flow) {
    if (this.children.has(flow)) {
      super.unpipe(flow)
      this.children.delete(flow)
      this.adapt(flow)
    } else {
      this.error("cannot unpipe a flow not found in local mapping", flow)
    }
    return null
  }
                 
  resolve(key) {
    let match = key.match(DynamicVariable)
    if (!match) return key
    return this.has(match[1]) ? this.get(match[1]) : key
  }

  use(key, value) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }

  has(key) {
    return this.map.has(key) || (this.parent ? this.parent.has(key) : false )
  }

  get(key) {
    if (this.map.has(key)) return this.map.get(key)
    if (this.parent) return this.parent.get(key)
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
    const { id, type, label, requires, inputs, outputs, map } = this
    return {
      id, type, label, requires, inputs, outputs, map: Array.from(map)
    }
  }

  toJSON() {
    const { id, type, label, requires, inputs, outputs } = this
    return {
      id, type, label, requires, inputs, outputs
    }
  }
}

delegate(StateMachine.prototype, 'map')
  .method('set')
  .method('delete')

delegate(StateMachine.prototype, 'cache')
  .getter('variables')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')

module.exports = StateMachine