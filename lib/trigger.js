'use strict';

try { var debug = require('debug')('kos:trigger') }
catch (e) { var debug = () => {} }

const KineticStream  = require('./stream')
const KineticObject  = require('./object')
const KineticContext = require('./context')

class KineticTrigger extends KineticStream {
  
  static none() {}

  get [Symbol.toStringTag]() { return 'KineticTrigger' }

  constructor(options={}) {
    super(options)

    let { inputs = [], outputs = [], requires = [], handler = KineticTrigger.none } = options

    if (inputs  && !Array.isArray(inputs))  inputs = [ inputs ]
    if (outputs && !Array.isArray(outputs)) outputs = [ outputs ]

    this._inputs  = new Set(inputs)
    this._outputs = new Set(outputs)
    this._requires = new Set(requires)
    this._handler = handler
  }

  filter(ko) {
    if (this.handler === KineticTrigger.none) return false
    if (this.ready(ko)) {
      let ctx = this.context
      ctx.event = ko.key
      ctx.arguments = this.inputs.map(x => this.state.get(x))
      // TODO: clear the local state for input triggers
      debug(this.identity, 'ƒ(' + this.inputs + ')')
      this.parent && this.parent.emit('fire', this)
      try { this.handler.apply(ctx, ctx.arguments) }
      catch (e) { 
        debug(e)
        this.error(e)
      }
    }
    return false
  }

  // accept ko if ALL conditions are met:
  // 1. ko is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(ko) {
    if (ko.match(this._requires)) {
      this.mark(ko, true)
      this.state.set(ko.key, ko.value)
    } 
    
    // TODO: should warn about dropped input triggers...
    if (this.requires.every(x => this.state.has(x)) && ko.match(this._inputs)) {
      this.mark(ko, true)
      this.state.set(ko.key, ko.value)
      // TODO: should also check parent
      return this.inputs.every(x => this.state.has(x))
    }
    return false
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

  // data objects that are pre-conditions for invoking the
  // KineticTrigger
  //
  // NOTE: the difference between `has()` and `in()` is that the
  // pre-condition data tokens stay sticky to the State Machine and
  // must be present before the declared input data tokens can invoke
  // the trigger.
  has(...keys) {
    for (const key of keys.filter(String)) {
      if (/^module\//.test(key)) {
        let target = key.match(/^module\/(.+)$/, '$1')
        try { this.init(key, require(target[1])) }
        catch (e) { debug('unable to auto-load require', key) }
      }
      this._requires.add(key)
    }
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
    return this.parent ? this.parent.loadTrigger(this) : this
  }

  send(key, value, id=this.id) {
    let ko = new KineticObject(key, value, id)
    if (!ko.match(this._outputs)) {
      throw new Error("[KineticTrigger:send] "+key+" not in ["+this.outputs+"]")
    }
    return this.push(ko)
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

  get parent()   { return this.state.get('parent') }
  get inputs()   { return Array.from(this._inputs)  }
  get outputs()  { return Array.from(this._outputs) }
  get requires() { return Array.from(this._requires) }
  get handler()  { return this._handler }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.trigger = this
    return ctx
  }

  get label() { return this.handler.name }

  get identity() {
    return this.parent ? this.parent.identity+':'+this.handler.name : this.handler.name
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

}

module.exports = KineticTrigger

