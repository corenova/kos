'use strict';

const uuid = require('uuid')
const debug = require('debug')('kos:state')
const delegate = require('delegates')
const EventEmitter = require('events')

const DynamicVariable = /^{(.+)}$/

class StateMachine extends EventEmitter {
  constructor(state) {
    super()
    this.map = new Map(state)
    this._requires  = new Set
    this._inputs    = new Set
    this._outputs   = new Set
    this._variables = new Map
  }

  get id()   { return this._id }
  set id(id) { this._id = id || uuid() }

  get parent()  { return this._parent }
  set parent(x) { this._parent = x }

  get label()  { return this._label || this.id }
  set label(x) { this._label = x }

  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }

  get init() { return this._init }
  set init(state) {
    this._init = state
    this.map.clear()
    this.save(state, { emit: false })
  }

  set props(obj) {
    if (typeof obj !== 'object') return
    for (let k of Object.keys(obj)) {
      this[k] = obj[k]
    }
  }

  get cache() {
    if (!this._cache) {
      let requires = Array.from(this._requires)
      let inputs   = Array.from(this._inputs)
      let outputs  = Array.from(this._outputs)
      let consumes
      let variables = requires.concat(inputs).reduce((a,key) => {
        let match = key.match(DynamicVariable)
        if (match) a.push(match[1])
        return a
      }, [])
      requires = requires.map(this.resolve.bind(this))
      inputs   = inputs.map(this.resolve.bind(this))
      consumes = requires.concat(inputs)
      this._cache = { variables, requires, inputs, outputs, consumes }
    }
    return this._cache
  }

  _populate(target, keys) {
    if (keys && keys.length) {
      target.clear()
      for (let key of keys) target.add(key)
    }    
  }

  set requires(keys) { this._populate(this._requires, keys) }
  set inputs(keys)   { this._populate(this._inputs, keys) }
  set outputs(keys)  { this._populate(this._outputs, keys) }

  set pre(key) { typeof key === 'string' && this._requires.add(key) }
  set in(key)  { typeof key === 'string' && this._inputs.add(key) }
  set out(key) { typeof key === 'string' && this._outputs.add(key) }

  seen(stimulus)         { return stimulus.has(this.id) }
  mark(stimulus, status) { return stimulus.tag(this.id, status) }

  // accept stimulus if ALL conditions are met:
  // 1. stimulus is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(stimulus) {
    const { topic, data } = stimulus

    if (this.seen(stimulus)) return false // seen before

    if (data === null) {
      this.delete(topic)
      return false
    }

    if (stimulus.match(this.consumes)) {
      this.mark(stimulus, true)
    } else {
      this.mark(stimulus)
      return false // not interested 
    }

    if (stimulus.match(this.variables)) {
      this.set(topic, data)
      this.adapt(stimulus)
      return false
    } 
    if (stimulus.match(this.requires)) {
      this.set(topic, data)
      return false
    } 
    if (stimulus.match(this.inputs)) {
      if (this.requires.every(this.has.bind(this))) {
        this.set(topic, data)
        // TODO: should also check flow?
        return this.inputs.every(this.has.bind(this))
      } else {
        // we drop this stimulus...
        this.mark(stimulus, false)
      }
    }
    return false
  }
                 
  resolve(key) {
    let match = key.match(DynamicVariable)
    if (!match) return key
    return this.has(match[1]) ? this.get(match[1]) : key
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

  save(state, opts={}) {
    const { emit = true } = opts
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
      if (diff && emit) this.emit("save", state)
    }
    return this
  }

  adapt(x) {
    this._cache = null
    this.parent && this.parent.adapt(x)
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
