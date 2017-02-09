'use strict';

const Transform = require('stream').Transform
const KineticState = require('./state')

// declared as var so it can be modified
var KineticObject = require('./object')

const contains = KineticState.contains

class KineticTransform extends Transform {

  static get Object() { return KineticObject }
  static set Object(x) { KineticObject = x }

  static get contains() { return contains }

  constructor(options={}) {
    super({ objectMode: true })

    this.state = new KineticState(options.state)
    this.state.parent = this

    this._inputs  = new Set(options.inputs)
    this._outputs = new Set(options.outputs)
    this._ignores = new Set(options.ignores)
    this._requires = new Set(options.requires)

    this.upstreams = new Set
    this.downstreams = new Set
  }

  // Kinetic Transform Implementation
  // default behavior is to passthrough for matching inputs
  //
  // NOTE: MUST BE SUBCLASSED, otherwise MAY cause infinite loop
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

  ready(ko) {
    if (this._requires.has(ko.key))
      this.state.set(ko.key, ko.value)
    return this.requires.every(x => this.state.has(x))
  }

  in(...keys) {
    for (let key of keys) this._inputs.add(key)
    return this
  }

  out(...keys) {
    for (let key of keys) this._outputs.add(key)
    return this
  }

  require(...keys) {
    for (let key of keys) {
      this._inputs.add(key)
      this._requires.add(key)
    }
    return this
  }

  default(key='', value) {
    if (key.constructor === Object)
      for (let k in key)
        this.state.set(k, key[k])
    else
      this.state.set(key, value)
    return this
  }

  join(stream) {
    if (!(stream instanceof KineticTransform))
      throw new Error("[join] can only join to other KineticTransforms, sorry", stream)
    this.parent = stream
    return this
  }

  // get data for key(s) from up the hierarchy if not in local state
  pull(...keys) {
    if (keys.every(x => this.state.has(x))) 
      return this.state.get(...keys)
    if (this.parent) 
      return this.parent.pull(...keys)
  }

  // set data for key/value up one hierarchy-level
  publish(key, value) {
    if (this.parent) {
      let state = this.parent.state
      if (state.has(key)) {
        let v = state.get(key)
        if (v instanceof Set)      return v.add(value)
        else if (Array.isArray(v)) return v.push(value)
      }
      state.set(key, value)
    }
  }

  // TODO: should we allow undefined/null value?

  // Convenience function for injecting KineticObject into Readable stream
  send(key, value) {
    if (!this._outputs.has('*') && !contains.call(this.outputs, key)) {
      throw new Error("[KineticTransform:send] "+key+" not in ["+this.outputs+"]")
    }
    return this.push(new KineticTransform.Object(key, value))
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, value) {
    this.write(new KineticTransform.Object(key, value))
    return this
  }

  // Overload default pipe implementation
  pipe(stream) {
    if (stream instanceof KineticTransform) {
      if (!this.isChainable(stream))
        throw new Error("[KineticTransform:pipe] cannot pipe to an incompatible stream")
      this.downstreams.add(stream)
      stream.upstreams.add(this)
    }
    return super.pipe(stream)
  }

  // 
  isChainable(stream) {
    if (!(stream instanceof KineticTransform)) return false
    let outputs = this.outputs
    let inputs = stream.inputs
    return outputs.filter(x => contains.call(inputs, x)).length > 0
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

  // send error
  throw(err) {
    if (!(err instanceof Error))
      err = new Error(err)
    err.flow = this
    this.push(new KineticTransform.Object('error',err))
    return err
  }

  get inputs()   { return Array.from(this._inputs)  }
  get outputs()  { return Array.from(this._outputs) }
  get requires() { return Array.from(this._requires) }
  get ignores()  { return Array.from(this._ignores) }

  inspect() {
    return {
      inputs: this.inputs,
      outputs: this.outputs,
      requires: this.requires,
      ignores: this.ignores,
      state: this.state
    }
  }
}

module.exports = KineticTransform
