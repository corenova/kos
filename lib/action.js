'use strict';

try { var debug = require('debug')('kos/action') }
catch (e) { var debug = () => {} }

const KineticTransform = require('./transform')
const KineticContext = require('./context')

class KineticAction extends KineticTransform {
  
  static none() {}

  constructor(options={}) {
    super(options)
    this.handler = options.handler || KineticAction.none
    if (options.stream)
      this.join(options.stream)
  }

  //--------------------------------------------------------
  // KineticAction Transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
    if (this.handler === KineticAction.none) return callback()

    super._transform(chunk, enc, (err, ko) => {
      if (err) return callback(err)
      if (ko) {
        let ctx = this.context
        ctx.trigger = ko
        ctx.arguments = this.inputs.map(x > this.state.get(x))
        debug(this.prefix, 'ƒ()', this.handler.name)
        try { this.handler.apply(ctx, ctx.arguments) }
        catch (e) { this.throw(e) }
      }
      callback()
    })
  }

  // accept ko if ALL conditions are met:
  // 1. it wasn't self-generated
  // 2. one of its requires/inputs
  // 3. is ready (requirements satisfied)
  // 4. one of its inputs to cause trigger
  // 5. all inputs satisfied
  accept(ko) {
    if (ko.origin !== this && super.accept(ko) && this.ready) {
      if (this._inputs.has(ko.key)) {
        this.state.set(ko.key, ko.value)
        return this.inputs.every(x => this.state.has(x))
      }
    }
    return false
  }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
    if (typeof fn !== 'function')
      throw new Error("[bind] expected function but got something else")
    this.handler = fn
    return this.parent ? this.parent.use(this) : this
  }

  inspect() {
    return Object.assign(super.inspect(), {
      handler: this.handler
    })
  }

  get context() {
    let ctx = Object.create(KineticContext)
    ctx.action = this
    return ctx
  }

  get prefix() {
    if (this.parent && this.parent.label)
      return this.parent.label()
  }

}

module.exports = KineticAction

