'use strict';

const KineticTransform = require('./transform')

class KineticAction extends KineticTransform {
  constructor(options={}) {
    super(options)
    this.handler = options.handler
	this.join(options.stream)
  }

  //--------------------------------------------------------
  // KineticAction Transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
	if (this.handler == null) return callback()

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

  join(stream) {
	if (stream instanceof KineticTransform)
	  this.stream = stream
	return this
  }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
	if (typeof fn !== 'function')
      throw new Error("[bind] expected function but got something else")
    this.handler = fn
    return this.stream || this
  }

  inspect() {
	return Object.assign(super.inspect(), {
	  handler: this.handler
	})
  }
}

module.exports = KineticAction

