'use strict';

const Transform = require('stream').Transform
const KineticState = require('./state')

// declared as var so it can be modified
var KineticObject = require('./object')

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

class KineticTransform extends Transform {

  static get Object() { return KineticObject }
  static set Object(x) { KineticObject = x }

  constructor(options={}) {
    super({ objectMode: true })

    if (options instanceof KineticTransform) {
      options = options.inspect()
    }
    if (options.state instanceof KineticState)
      this.state = options.state
    else
      this.state = new KineticState(options.state)

    for (let key of [ 'inputs', 'outputs', 'requires' ]) {
      let value = options[key]
      if (value && !Array.isArray(value))
        options[key] = [ value ]
    }
    this._inputs   = new Set(options.inputs)
    this._outputs  = new Set(options.outputs)
    this._requires = new Set(options.requires)

    this.providers = new Set
    this.consumers = new Set
  }

  // Kinetic Transform Implementation
  // default behavior is to passthrough for matching inputs
  //
  // NOTE: MUST BE SUBCLASSED, otherwise MAY cause infinite loop
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject))
      return callback(new Error("chunk is not a KineticObject"))

    this.accept(chunk) ? callback(null, chunk) : callback()
  }

  accept(ko) {
    if (this._requires.has(ko.key)) {
      this.state.set(ko.key, ko.value)
      return true
    }
    return this.inputs.includes(ko.key)
  }

  get ready() { return this.requires.every(x => this.state.has(x)) }

  in(...keys) {
    for (const key of keys.filter(Boolean)) this._inputs.add(key)
    return this
  }

  out(...keys) {
    for (const key of keys.filter(Boolean)) this._outputs.add(key)
    return this
  }

  require(...keys) {
    for (const key of keys.filter(Boolean)) this._requires.add(key)
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
      throw new Error("[KineticTransform:send] "+key+" not in ["+this.provides+"]")
    }
    return this.push(new KineticTransform.Object(key, value, this))
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, value) {
    this.write(new KineticTransform.Object(key, value, this))
    return this
  }

  // Overload default pipe implementation
  pipe(stream) {
    if (stream instanceof KineticTransform) {
      if (!this.isChainable(stream))
        throw new Error("[KineticTransform:pipe] cannot pipe to an incompatible stream")
      this.consumers.add(stream)
      stream.providers.add(this)
    }
    return super.pipe(stream)
  }

  // 
  isChainable(stream) {
    if (!(stream instanceof KineticTransform)) return false
    let outputs = this.outputs
    return stream.inputs.some(key => contains.call(outputs, key))
  }

  // send error
  throw(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticTransform.Object('error',err, this))
    return err
  }

  get inputs()   { return Array.from(this._inputs)  }
  get outputs()  { return Array.from(this._outputs) }
  get requires() { return Array.from(this._requires) }

  inspect() {
    return {
      inputs: this.inputs,
      outputs: this.outputs,
      requires: this.requires,
      state: Array.from(this.state)
    }
  }
}

module.exports = KineticTransform
