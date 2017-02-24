'use strict';

const uuid = require('uuid')
const Transform = require('stream').Transform
const KineticState = require('./state')

// declared as var so it can be modified
var KineticObject = require('./object')

class KineticEssence extends Transform {

  static get Object() { return KineticObject }
  static set Object(x) { KineticObject = x }

  constructor(options={}) {
    super({ objectMode: true })

    if (options instanceof KineticEssence) {
      options = options.inspect()
    }

    if (options.state instanceof KineticState)
      this.state = options.state
    else
      this.state = new KineticState(options.state)

    this.id = uuid()
    this.providers = new Set
    this.consumers = new Set
  }

  // Kinetic Transform Implementation
  //
  // Basic enforcement of chunk to be KineticObject
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject))
      return callback(new Error("chunk is not a KineticObject"))

    // ignore chunks it's seen before
    chunk.tags.has(this.id) ? callback() : callback(null, chunk.tag(this.id))
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
    if (!(stream instanceof KineticEssence))
      throw new Error("[join] can only join to other KineticEssences, sorry", stream)
    this.parent = stream
    return this
  }

  // get data for key(s) from up the hierarchy if not in local state
  fetch(...keys) {
    if (keys.every(x => this.state.has(x))) 
      return this.state.get(...keys)
    if (this.parent) 
      return this.parent.pull(...keys)
  }

  // set data for key/value up one hierarchy-level
  post(key, value) {
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
  send(key, ...values) {
    for (const value of values)
      this.push(new KineticObject(key, value, this.id))
    return this
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, ...values) {
    for (const value of values)
      this.write(new KineticObject(key, value))
    return this
  }

  // Overload default pipe implementation
  pipe(stream) {
    if (stream instanceof KineticEssence) {
      this.consumers.add(stream)
      stream.providers.add(this)
    }
    return super.pipe(stream)
  }

  // send error
  throw(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticObject('error',err, this))
    return err
  }

  get type() { return this.constructor.name }

  inspect() {
    return {
      id:    this.id,
      type:  this.type,
      state: Array.from(this.state)
    }
  }
}

module.exports = KineticEssence
