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

  //--------------------------------------------------------
  // primary transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
    if (this.handler === KineticTrigger.none) return callback()

    super._transform(chunk, enc, (err, ko) => {
      if (err) return callback(err)
      if (ko && this.ready(ko)) {
        let ctx = this.context
        ctx.event = ko.key
        ctx.arguments = this.inputs.map(x => this.state.get(x))
        // TODO: clear the local state for input triggers
        debug(this.identity, 'ƒ(' + this.inputs + ')')
        try { this.handler.apply(ctx, ctx.arguments) }
        catch (e) { 
          debug(e)
          this.error(e)
        }
      }
      callback()
    })
  }

  // accept ko if ALL conditions are met:
  // 1. ko is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(ko) {
    ko.match(this._requires) && this.state.set(ko.key, ko.value)
    
    // TODO: should warn about dropped input triggers...
    if (this.requires.every(x => this.state.has(x)) && ko.match(this._inputs)) {
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

  // data objects required for invoking the KineticTrigger 
  //
  // NOTE: the difference between `use()` and `in()` is that required
  // data objects are pre-requisites for the reaction and remain
  // sticky to the State Machine
  use(...keys) {
    for (const key of keys.filter(String)) {
      if (/^module\//.test(key)) {
        let target = key.match(/^module\/(.+)$/, '$1')
        try { this.setState(key, require(target[1])) }
        catch (e) { debug('unable to auto-load require', key) }
      }
      this._requires.add(key)
    }
    return this
  }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
    let parent = this.state.get('parent')
    if (typeof fn !== 'function')
      throw new Error("[bind] expected function but got something else")
    this._handler = fn
    return parent ? parent.addTrigger(this) : this
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
    let parent = this.state.get('parent')
    return parent ? parent.identity+':'+this.handler.name : this.handler.name
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

