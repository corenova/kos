'use strict';

try { var debug = require('debug')('kos/action') }
catch (e) { var debug = () => {} }

const KineticTransform = require('./transform')

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
      if (err != null) return callback(err)
      if (ko == null) return callback()

      if (this.ready(ko) && this.state.ready(ko)) {
        debug(this.prefix, 'ƒ()', this.handler.name)
        this.handler.call(this.state, ko)
      }
      callback()
    })
  }

  get prefix() {
    if (this.parent && this.parent.label)
      return this.parent.label()
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
}

module.exports = KineticAction

