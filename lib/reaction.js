'use strict';

const debug = require('debug')('kos:reaction')
const uuid = require('uuid')
const delegate = require('delegates')

const Stimuli = require('./stimuli')
const Context = require('./context')

const DynamicVariable = /^{(.+)}$/

class DynamicFunction extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype)
  }
}

class Reaction extends DynamicFunction {
  
  static none() {}

  get [Symbol.toStringTag]() { return `Reaction:${this.label}` }

  constructor(props={}) {
    //const trigger = stimuli => this.exec(token)
    super(token => this.exec(token))

    if (props instanceof Reaction) {
      props = props.inspect()
      delete props.id
    }
    let { 
      id = uuid(),
      inputs = [], 
      outputs = [], 
      requires = [],
      handler = Reaction.none } = props

    if (props.state instanceof Map)
      this.state = props.state
    else
      this.state = new Map(props.state)

    this._variables = new Map
    this._requires  = new Set(requires)
    this._inputs    = new Set(inputs)
    this._outputs   = new Set(outputs)
    this._handler   = handler

    if (typeof handler !== 'function') {
      this.debug(`restoring function from source`)
      try { this._handler = new Function(`return (${handler.source})`)() }
      catch (e) { 
        this.warn("unable restore from source", handler.source, e)
      }
    }
  }

  exec(token) {
    if (this.ready(token)) {
      let ctx = this.context
      let [ idx ] = token.match(this.inputs)
      let args = this.inputs.map(this.get.bind(this))
      ctx.token = token
      ctx.event = token.key
      // TODO: clear the local state for input triggers?
      debug(this.identity, 'ƒ(' + this.inputs + ')', 'call', token.length, 'time(s)')
      this.flow && this.flow.emit('fire', this)

      //debug(this.identity, 'args:', args)
      //debug(this.identity, 'token:', token)

      // Since token may have multiple outputs generated, we collect
      // all "send" operations and "compress" them into bulk token(s).
      for (let data of token) {
        args[idx] = data
        try { this.handler.apply(ctx, args.concat(ctx)) }
        catch (e) { debug(e); this.error(e) }
      }
      ctx.flush()
      return true
    }
    return false // always prevent propagation of the incoming token
  }

  // accept token if ALL conditions are met:
  // 1. token is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(token) {
    if (!(token instanceof Stimuli)) return false
    if (token.tags.has(this.id)) return false // seen before
    if (!token.match(this.consumes)) return false // not interested
    
    const { key, value } = token
    if (token.match(this.variables)) {
      this.mark(token, true)
      this.set(key, value)
      this._cache = null
      return false
    } 
    if (token.match(this.requires)) {
      this.mark(token, true)
      this.set(key, value)
      return false
    } 
    // TODO: should warn about dropped input triggers...
    if (this.requires.every(this.has.bind(this)) && token.match(this.inputs)) {
      this.mark(token, true)
      this.set(key, value)
      // TODO: should also check flow?
      return this.inputs.every(this.has.bind(this))
    }
    return false
  }

  // RULE DEFINITION INTERFACE


  // data objects that are required pre-conditions for invoking the
  // Reaction
  //
  // NOTE: the difference between `has()` and `in()` is that the
  // pre-condition data tokens stay sticky to the State Machine and
  // must be present before the declared input data tokens can invoke
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
    return this.flow
  }

  join(reactor) {
    
  }

  // END Of RULE DEFINITION INTERFACE


  // enforce check for output tokens
  send(key) {
    if (!Stimuli.prototype.match.call({key}, this.outputs))
      throw new Error("[Reaction:send] "+key+" not in ["+this.outputs+"]")
    return super.send(...arguments)
  }

  // STATE interaction overloads
  has(key) {
    // TODO: consider supporting key as wildcard match?
    return this.state.has(key) || (this.parent ? this.parent.has(key) : false)
  }

  get(key) {
    if (this.state.has(key)) return this.state.get(key)
    if (this.parent) return this.parent.get(key)
  }

  clear(...keys) {
    if (!arguments.length)
      this.inputs.forEach(this.delete.bind(this))
    else
      keys.forEach(this.delete.bind(this))
  }

  resolve(key) {
    let match = key.match(DynamicVariable)
    if (!match) return key
    return this.has(match[1]) ? this.get(match[1]) : key
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reaction
  //----------------------------------------------

  get type()   { return Symbol.for('kos:reaction') }
  get label()  { return this.handler.name }
  get source() { 
    return typeof this.handler === 'function' ? this.handler.toString() : this.handler.source
  }
  get handler()   { return this._handler }
  get reactor()   { return this.parent }

  get context() {
    let ctx = Object.create(Context)
    ctx.trigger = this
    ctx.queue = new Map
    return ctx
  }

  get cache() {
    if (!this._cache) {
      let requires  = Array.from(this._requires)
      let inputs    = Array.from(this._inputs)
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

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this.label,
      inputs:   this.inputs,
      outputs:  this.outputs,
      requires: this.requires,
      handler:  this.handler
    })
  }

  toJSON() {
    const { label, source } = this
    return Object.assign(super.toJSON(), {
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

module.exports = Reaction

