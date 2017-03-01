'use strict';

try { var debug = require('debug')('kos/reactor') }
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
        // special case if no inputs declared
        if (!this._inputs.size) {
          ctx.arguments = [ ko ]
          debug(this.identity, 'ƒ(' + ko.key + ')')
        }
        else {
          ctx.arguments = this.inputs.map(x => this.state.get(x))
          debug(this.identity, 'ƒ(' + this.inputs + ')')
        }
        try { this.handler.apply(ctx, ctx.arguments) }
        catch (e) { 
          console.error(e)
          this.throw(e) 
        }
      }
      callback()
    })
  }

  // accept ko if ALL conditions are met:
  // 1. ko is one of its inputs to cause trigger
  // 2. all inputs satisfied
  ready(ko) {
    if (ko) {
      if (!this._inputs.size) return true // accept everything
      if (this._inputs.has(ko.key)) {
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
    if (!this._outputs.has('*') && !contains.call(this.outputs, key)) {
      throw new Error("[KineticReactor:send] "+key+" not in ["+this.outputs+"]")
    }
    return super.send(key, value)
  }

  // Overload default pipe implementation
  pipe(stream) {
    if (stream instanceof KineticReactor) {
      if (!this.isChainable(stream))
        throw new Error("[KineticReactor:pipe] cannot pipe to an incompatible stream")
      this.consumers.add(stream)
      stream.providers.add(this)
    }
    return super.pipe(stream)
  }

  // 
  isChainable(stream) {
    if (!(stream instanceof KineticReactor)) return false
    let outputs = this.outputs
    if (!stream.inputs.length || !outputs.length) return true
    return stream.inputs.some(key => contains.call(outputs, key))
  }

  get inputs()  { return Array.from(this._inputs)  }
  get outputs() { return Array.from(this._outputs) }
  get handler() { return this._handler }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.reactor = this
    return ctx
  }

  get identity() {
    let parent = this.state.get('parent')
    return parent ? parent.identity+':'+this.handler.name : this.handler.name
  }

  get debug() { return debug.bind(this, this.label, 'debug') }

  inspect() {
    return Object.assign(super.inspect(), {
      inputs: this.inputs,
      outputs: this.outputs,
      handler: this.handler
    })
  }

}

function compareKeys(k1, k2) {
  if (k1 == k2) return true
  if (!k1 || !k2) return false

  if (typeof k1 === 'string' && typeof k2 === 'string') {
    let x = '^'+k1.replace('*','.*')+'$'
    let y = '^'+k2.replace('*','.*')+'$'
    return (k2.match(x) != null || k1.match(y) != null)
  }
  if (typeof k2 === 'string') return k2.match(k1) != null
  if (typeof k1 === 'string') return k1.match(k2) != null
  
  return false
}

function contains(key) {
  return this.some(x => compareKeys(x, key))
}

module.exports = KineticReactor

