'use strict';

const Transform = require('stream').Transform
const KineticState = require('./state')
const KineticObject = require('./object')

function contains(key) {
  return this.some(test)
  function test(x) {
	if (x !== key) {
	  return key.match('^'+x+'$') != null
	}
	return true
  }
}

class KineticTransform extends Transform {
  constructor(options={}) {
    super({ objectMode: true })

    this.state = new KineticState(options.state)
    this.state.parent = this

    this._inputs  = new Set(options.inputs)
    this._outputs = new Set(options.outputs)
    this._ignores = new Set(options.ignores)
  }

  // Kinetic Transform Implementation
  // default behavior is to passthrough for matching inputs
  //
  // NOTE: SHOULD BE SUBCLASSED with more meaningful implementation
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject))
      return callback(new Error("chunk is not a KineticObject"))
	if (!contains.call(this.ignores, chunk.key) &&
		contains.call(this.inputs, chunk.key)) {
	  callback(null, chunk)
	} else {
	  callback()
	}
  }

  in(...keys) {
	for (let key of keys) this._inputs.add(key)
    return this
  }

  out(...keys) {
	for (let key of keys) this._outputs.add(key)
    return this
  }

  // Convenience function for injecting KineticObject
  send(key, value) {
	if (!contains.call(this.outputs, key))
      throw new Error("[KineticTransform:send] "+key+" not in ["+this.outputs+"]")
	return this.push(new KineticObject(key, value))
  }

  // Convenience function for injecting KineticObject
  feed(key, value) {
	return this.write(new KineticObject(key, value))
  }

  // Advanced Usage (typically used for troubleshooting)
  //
  // enable/disable handling of specified key(s)
  disable(...keys) {
	for (let key of keys) this._ignores.add(key)
    return this
  }
  enable(...keys) {
	for (let key of keys) this._ignores.delete(key)
    return this
  }

  get inputs()  { return Array.from(this._inputs) }
  get outputs() { return Array.from(this._outputs) }
  get ignores() { return Array.from(this._ignores) }

  inspect() {
	return {
      inputs: this.inputs,
      outputs: this.outputs,
	  ignores: this.ignores,
      state: this.state
	}
  }
}

module.exports = KineticTransform
