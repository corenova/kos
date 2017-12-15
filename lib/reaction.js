'use strict';

const debug = require('debug')('kos:reaction')
const uuid = require('uuid')
const delegate = require('delegates')

const Context = require('./context')
const DynamicVariable = /^{(.+)}$/

class DynamicFunction extends Function {
  constructor(f) {
    super()
    return Object.setPrototypeOf(f, Reaction.prototype)
  }
}

class Reaction extends DynamicFunction {
  
  static none() {}

  get [Symbol.toStringTag]() { return `Reaction:${this.label}` }

  constructor(props={}, reactor) {
    const reaction = stimulus => this.exec(stimulus)
    super(reaction)

    if (props instanceof Reaction) {
      props = props.inspect()
      delete props.id
    }
    let { 
      inputs = [], 
      outputs = [], 
      requires = [],
      handler = Reaction.none } = props

    if (props.state instanceof Map)
      this.state = props.state
    else
      this.state = new Map(props.state)

    this.id = props.id || uuid()
    this._reactor   = reactor
    this._variables = new Map
    this._requires  = new Set(requires)
    this._inputs    = new Set(inputs)
    this._outputs   = new Set(outputs)
    this._handler   = handler

    if (typeof handler !== 'function') {
      try { this._handler = new Function(`return (${handler.source})`)() }
      catch (e) { throw new Error('unable to restore function from source', handler) }
      debug(this.identity, 'restored function from source')
    }
  }

  exec(stimulus) {
    if (this.ready(stimulus)) {
      let ctx = this.context
      let [ idx ] = stimulus.match(this.inputs)
      let args = this.inputs.map(this.get.bind(this))
      ctx.type = stimulus.key
      // TODO: clear the local state for input triggers?
      debug(this.identity, 'ƒ(' + this.inputs + ')', 'call', stimulus.length, 'time(s)')
      this.reactor && this.reactor.emit('fire', this)

      //debug(this.identity, 'args:', args)
      //debug(this.identity, 'stimulus:', stimulus)

      // Since stimulus may have multiple outputs generated, we collect
      // all "send" operations and "compress" them into bulk stimulus(s).
      for (let data of stimulus) {
        args[idx] = data
        try { this.handler.apply(ctx, args.concat(ctx)) }
        catch (e) { e.origin = this; debug(e); throw e; }
      }
      ctx.flush()
      return true
    }
    return false // always prevent propagation of the incoming stimulus
  }

  // accept stimulus if ALL conditions are met:
  // 1. stimulus is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(stimulus) {
    if (stimulus.tags.has(this.id)) return false // seen before

    if (stimulus.match(this.consumes)) {
      stimulus.tag(this.id, true)
    } else {
      stimulus.tag(this.id)
      return false // not interested 
    }

    const { key, value } = stimulus

    if (stimulus.match(this.variables)) {
      this.state.set(key, value)
      this._cache = null
      return false
    } 
    if (stimulus.match(this.requires)) {
      this.state.set(key, value)
      return false
    } 

    // TODO: should warn about dropped input triggers...
    if (this.requires.every(this.has.bind(this)) && stimulus.match(this.inputs)) {
      this.state.set(key, value)
      // TODO: should also check flow?
      return this.inputs.every(this.has.bind(this))
    }
    return false
  }

  join(reactor) {
    this._reactor = reactor
    return this
  }

  // RULE DEFINITION INTERFACE


  // data objects that are required pre-conditions for invoking the
  // Reaction
  //
  // NOTE: the difference between `has()` and `in()` is that the
  // pre-condition data stimuluss stay sticky to the State Machine and
  // must be present before the declared input data stimulus can invoke
  // the trigger.
  pre(...keys) {
    for (const key of keys.filter(String)) this._requires.add(key)
    return this
  }
  
  // data objects consumed as input(s) by the Reaction
  in(...keys) {
    for (const key of keys.filter(String)) this._inputs.add(key)
    return this
  }

  // data objects produced as output(s) by the Reaction
  out(...keys) {
    for (const key of keys.filter(String)) this._outputs.add(key)
    return this
  }

  // a no-op continuation grammer for improving readability
  get and() { return this }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
    if (typeof fn !== 'function')
      throw new Error("[Reaction:bind] expected function but got something else")
    this._handler = fn
    debug(this.identity, '@', this.id)
    this._cache = null // clear the cache
    this.reactor.emit('adapt', this)
    return this.reactor.parent
  }

  // END Of RULE DEFINITION INTERFACE
  push(stimulus) { this.reactor.write(stimulus) }

  //
  // STATE interactions
  // 
  has(key) {
    // TODO: consider supporting key as wildcard match?
    return this.state.has(key) || (this.reactor ? this.reactor.state.has(key) : false)
  }
  get(key) {
    if (this.state.has(key)) return this.state.get(key)
    if (this.reactor) return this.reactor.state.get(key)
    return null
  }
  set()    { return this.state.set(...arguments) }
  delete() { return this.state.delete(...arguments) } 
  clear(...keys) {
    if (!arguments.length)
      this.inputs.forEach(x => this.state.delete(x))
    else
      keys.forEach(x => this.state.delete(x))
  }
  resolve(key) {
    let match = key.match(DynamicVariable)
    if (!match) return key
    return this.has(match[1]) ? this.get(match[1]) : key
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reaction
  //----------------------------------------------

  get type()     { return Symbol.for('kos:reaction') }
  get label()    { return this.handler ? this.handler.name : this.name }
  get identity() { return this.reactor ? this.reactor.identity+'/'+this.label : this.label }
  get reactor()  { return this._reactor }
  get handler()   { return this._handler }
  get source()   { 
    return typeof this.handler === 'function' ? this.handler.toString() : this.handler.source
  }

  get context() {
    let ctx = Object.create(Context)
    ctx.reaction = this
    ctx.queue = new Map
    return ctx
  }

  get cache() {
    const regex = /^module\/(.+)$/
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
      let depends = requires.filter(x => regex.test(x))
      requires = requires.map(this.resolve.bind(this))
      inputs   = inputs.map(this.resolve.bind(this))
      consumes = requires.concat(inputs)
      this._cache = { variables, requires, inputs, outputs, consumes, depends }
    }
    return this._cache
  }

  inspect() {
    return {
      id:       this.id,
      label:    this.label,
      requires: this.requires,
      inputs:   this.inputs,
      outputs:  this.outputs,
      handler:  this.handler
    }
  }

  toJSON() {
    const { label, source } = this
    return Object.assign(this.inspect(), {
      handler: { label, source }
    })
  }
}

delegate(Reaction.prototype, 'cache')
  .getter('variables')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .getter('consumes')
  .getter('depends')

module.exports = Reaction

