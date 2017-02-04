'use strict';

const KineticTransform = require('./transform')

function none() {}

class KineticAction extends KineticTransform {
  constructor(options={}) {
    super(options)
    this.handler = options.handler || none
	this.join(options.stream)
  }

  //--------------------------------------------------------
  // KineticAction Transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
	if (this.handler === none) return callback()

	super._transform(chunk, enc, (err, ko) => {
	  if (err != null) return callback(err)
	  if (ko != null) {
		this.state.set(ko.key, ko.value)
		if (this.state.ready) {
		  this.handler.call(this.state, ko)
		}
	  }
	  callback()
	})
  }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
	if (typeof fn !== 'function')
      throw new Error("[bind] expected function but got something else")
    this.handler = fn
    return this.parent || this
  }

  inspect() {
	return Object.assign(super.inspect(), {
	  handler: this.handler
	})
  }
}

module.exports = KineticAction

