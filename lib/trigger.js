'use strict';

const debug = require('debug')('kos:trigger')

const KineticStream  = require('./stream')
const KineticToken   = require('./token')
const KineticContext = require('./context')

class KineticTrigger extends KineticStream {
  
  static none() {}

  get [Symbol.toStringTag]() { return 'KineticTrigger' }

  constructor(options={}) {
    super(options)

    let { inputs = [], outputs = [], requires = [], handler = KineticTrigger.none } = options

    if (inputs   && !Array.isArray(inputs))   inputs   = [ inputs ]
    if (outputs  && !Array.isArray(outputs))  outputs  = [ outputs ]
    if (requires && !Array.isArray(requires)) requires = [ requires ]

    this._inputs   = new Set(inputs)
    this._outputs  = new Set(outputs)
    this._requires = new Set(requires)
    this._handler  = handler

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
        try { this.handler.apply(ctx, args) }
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
    if (token.match(this._requires)) {
      this.mark(token, true)
      this.set(key, value)
      return false
    } 
    // TODO: should warn about dropped input triggers...
    if (this.requires.every(x => this.has(x)) && token.match(this._inputs)) {
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
      throw new Error("[bind] expected function but got something else")
    this._handler = fn
    return this.parent ? this.parent.add(this) : this
  }

  // END Of RULE DEFINITION INTERFACE


  // enforce check for output tokens
  send(key) {
    if (!KineticToken.prototype.match.call({key}, this._outputs))
      throw new Error("[KineticTrigger:send] "+key+" not in ["+this.outputs+"]")
    return super.send(...arguments)
  }

  reset() {
    this.inputs.forEach(x => this.delete(x))
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

  get type() { return Symbol.for('kinetic.trigger') }
  get name()   { return this.handler.name }
  get source() { 
    return this.handler instanceof Function ? this.handler.toString() : this.handler.source
  }

  get inputs()   { return Array.from(this._inputs)  }
  get outputs()  { return Array.from(this._outputs) }
  get requires() { return Array.from(this._requires) }
  get handler()  { return this._handler }
  get reactor()  { return this.parent }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.trigger = this
    return ctx
  }

  inspect() {
    return Object.assign(super.inspect(), {
      name:     this.name,
      inputs:   this.inputs,
      outputs:  this.outputs,
      requires: this.requires,
      handler:  this.handler
    })
  }

  toJSON() {
    const { name, source } = this
    return Object.assign(super.toJSON(), {
      handler: { name, source }
    })
  }

}

module.exports = KineticTrigger

