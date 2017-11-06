'use strict';

const debug = require('debug')('kos:trigger')
const delegate = require('delegates')

const KineticStream  = require('./stream')
const KineticToken   = require('./token')
const KineticContext = require('./context')

const TriggerVariable = /^{(.+)}$/

class KineticTrigger extends KineticStream {
  
  static none() {}

  get [Symbol.toStringTag]() { return 'KineticTrigger' }

  constructor(props={}) {
    super(props)

    let { 
      inputs = [], 
      outputs = [], 
      requires = [],
      handler = KineticTrigger.none } = this.props

    if (inputs   && !Array.isArray(inputs))   inputs   = [ inputs ]
    if (outputs  && !Array.isArray(outputs))  outputs  = [ outputs ]
    if (requires && !Array.isArray(requires)) requires = [ requires ]

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

  filter(token) {
    if (typeof this.handler !== 'function') return false
    if (this.ready(token)) {
      let ctx = this.context
      let [ idx ] = token.match(this.inputs)
      let args = this.inputs.map(x => this.get(x))
      ctx.queue = new Map
      ctx.event = token.key
      // TODO: clear the local state for input triggers?
      debug(this.identity, 'ƒ(' + this.inputs + ')', 'call', token.length, 'time(s)')
      this.parent && this.parent.emit('fire', this)

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
    }
    return false // always prevent propagation of the incoming token
  }

  // accept token if ALL conditions are met:
  // 1. token is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(token) {
    let { key, value } = token
    if (token.match(this.variables)) {
      this.mark(token, true)
      this.set(key, value)
      this.emit('adapt')
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
      // TODO: should also check parent
      return this.inputs.every(x => this.has(x))
    }
    return false
  }

  // RULE DEFINITION INTERFACE


  // data objects that are required pre-conditions for invoking the
  // KineticTrigger
  //
  // NOTE: the difference between `has()` and `in()` is that the
  // pre-condition data tokens stay sticky to the State Machine and
  // must be present before the declared input data tokens can invoke
  // the trigger.
  pre(...keys) {
    for (const key of keys.filter(String)) this._requires.add(key)
    return this
  }
  
  // data objects consumed as input(s) by the KineticTrigger
  in(...keys) {
    for (const key of keys.filter(String)) this._inputs.add(key)
    return this
  }

  // data objects produced as output(s) by the KineticTrigger
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
      throw new Error("[KineticTrigger:bind] expected function but got something else")
    this._handler = fn
    return this.parent
  }

  // END Of RULE DEFINITION INTERFACE


  // enforce check for output tokens
  send(key) {
    if (!KineticToken.prototype.match.call({key}, this.outputs))
      throw new Error("[KineticTrigger:send] "+key+" not in ["+this.outputs+"]")
    return super.send(...arguments)
  }

  reset() {
    this.inputs.forEach(x => this.delete(x))
  }

  resolveVariable(key) {
    let match = key.match(TriggerVariable)
    if (!match) return key
    return this.has(match[1]) ? this.get(match[1]) : key
  }

  // TODO: consider when we support Trigger -> Trigger -> Trigger type pipelines
  // 
  // pipe(stream) {
  //   if (stream instanceof KineticTrigger) {
  //     if (!this.isChainable(stream))
  //       throw new Error("[KineticTrigger:pipe] cannot pipe to an incompatible stream")
  //   }
  //   return super.pipe(stream)
  // }
  //
  // isChainable(stream) {
  //   if (!(stream instanceof KineticTrigger)) return false
  //   return stream.inputs.some(key => this._outputs.has(key))
  // }

  //----------------------------------------------
  // Collection of Getters for inspecting Trigger
  //----------------------------------------------

  get type()   { return Symbol.for('kinetic.trigger') }
  get label()  { return this.handler.name }
  get source() { 
    return this.handler instanceof Function ? this.handler.toString() : this.handler.source
  }
  get handler()   { return this._handler }
  get reactor()   { return this.parent }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.trigger = this
    return ctx
  }

  get cache() {
    if (!this._cache) {
      let requires  = Array.from(this._requires)
      let inputs    = Array.from(this._inputs)
      let variables = requires.concat(inputs).reduce((a,key) => {
        let match = key.match(TriggerVariable)
        if (match) a.push(match[1])
        return a
      }, [])
      this._cache = {
        variables: variables,
        requires:  requires.map(this.resolveVariable.bind(this)),
        inputs:    inputs.map(this.resolveVariable.bind(this)),
        outputs:   Array.from(this._outputs)
      }
      this.once('adapt', () => { this._cache = null })
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

delegate(KineticTrigger.prototype, 'cache')
  .getter('variables')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')

module.exports = KineticTrigger

