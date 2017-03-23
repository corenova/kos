'use strict';

try { var debug = require('debug')('kos:reactor') }
catch (e) { var debug = () => {} }

const KineticEssence = require('./essence')
const KineticContext = require('./context')

class KineticReactor extends KineticEssence {
  
  static none() {}

  constructor(options={}) {
    super(options)

    let { inputs = [], outputs = [], handler = KineticReactor.none } = options

    if (inputs  && !Array.isArray(inputs))  inputs = [ inputs ]
    if (outputs && !Array.isArray(outputs)) outputs = [ outputs ]

    this._inputs  = new Set(inputs)
    this._outputs = new Set(outputs)
    this._handler = handler
  }

  //--------------------------------------------------------
  // primary transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
    if (this.handler === KineticReactor.none) return callback()

    super._transform(chunk, enc, (err, ko) => {
      if (err) return callback(err)
      if (this.ready(ko)) {
        let ctx = this.context
        ctx.trigger = ko.key
        ctx.arguments = this.inputs.map(x => this.state.get(x))
        debug(this.identity, 'ƒ(' + this.inputs + ')')
        try { this.handler.apply(ctx, ctx.arguments) }
        catch (e) { this.error(e) }
      }
      callback()
    })
  }

  // accept ko if ALL conditions are met:
  // 1. ko is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(ko) {
    if (ko) {
      if (ko.match(this._inputs)) {
        this.state.set(ko.key, ko.value)
        return this.inputs.every(x => this.state.has(x))
      }
    }
    return false
  }

  in(...keys) {
    for (const key of keys.filter(Boolean)) this._inputs.add(key)
    return this
  }

  out(...keys) {
    for (const key of keys.filter(Boolean)) this._outputs.add(key)
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
    return parent ? parent.include(this) : this
  }

  send(key, value) {
    let ko = new KineticEssence.Object(key, value, this.id)
    if (!ko.match(this._outputs)) {
      throw new Error("[KineticReactor:send] "+key+" not in ["+this.outputs+"]")
    }
    return this.push(ko)
  }

  // TODO: consider when we support Reactor -> Reactor -> Reactor type pipelines
  // 
  // pipe(stream) {
  //   if (stream instanceof KineticReactor) {
  //     if (!this.isChainable(stream))
  //       throw new Error("[KineticReactor:pipe] cannot pipe to an incompatible stream")
  //   }
  //   return super.pipe(stream)
  // }
  //
  // isChainable(stream) {
  //   if (!(stream instanceof KineticReactor)) return false
  //   return stream.inputs.some(key => this._outputs.has(key))
  // }

  get stream()  { return this.state.get('parent') }
  get inputs()  { return Array.from(this._inputs)  }
  get outputs() { return Array.from(this._outputs) }
  get handler() { return this._handler }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.reactor = this
    return ctx
  }

  get label() { return this.handler.name }

  get identity() {
    let parent = this.state.get('parent')
    return parent ? parent.identity+':'+this.handler.name : this.handler.name
  }

  inspect() {
    return Object.assign(super.inspect(), {
      label: this.label,
      inputs: this.inputs,
      outputs: this.outputs,
      handler: this.handler
    })
  }

}

module.exports = KineticReactor

