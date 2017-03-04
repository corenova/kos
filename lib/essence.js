'use strict';

try { var debug = require('debug')('kos:essence') }
catch (e) { var debug = () => {} }

const uuid = require('uuid')
const { Transform, Duplex } = require('stream')
const KineticState = require('./state')

// declared as var so it can be modified
var KineticObject = require('./object')

class KineticEssence extends Transform {

  static get Object() { return KineticObject }
  static set Object(x) { KineticObject = x }

  constructor(options={}) {
    if (options instanceof KineticEssence) {
      options = options.inspect()
    }
    options.objectMode = true

    super(options)

    this.id = uuid()

    if (options.state instanceof KineticState)
      this.state = options.state
    else
      this.state = new KineticState(options.state)
    
    this.buffer = ''
  }

  // Kinetic Transform Implementation
  //
  // Basic enforcement of chunk to be KineticObject
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject))
      return callback(new Error("chunk is not a KineticObject"))

    // ignore chunks it's seen before, otherwise mark it and send it along
    this.seen(chunk) ? callback() : callback(null, this.mark(chunk))
  }

  default(key='', value) {
    if (key.constructor === Object)
      for (let k in key)
        this.state.set(k, key[k])
    else
      this.state.set(key, value)
    return this
  }

  seen(ko) { return ko.tags.has(this.id) }
  mark(ko, status) { return ko.tag(this.id, status) }

  join(stream) {
    if (!(stream instanceof KineticEssence))
      throw new Error("[join] can only join to other KineticEssences, sorry", stream)
    this.state.set('parent', stream)
    return this
  }

  // A special "wrapper" method that creates a new KineticEssence
  // stream around the current stream instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from KineticObjects.
  //
  // It also offers "passthrough" flag (default false) which if set to
  // true will allow the SAME incoming chunk to going out the other
  // end. This should be used with care since piping via passthrough
  // MAY result in infinite loop across flow instances.
  io(opts={}) {
    let { passthrough = false, verbose = false } = opts
    let self = this
    let buffer = ''
    let lines = []
    let wrapper = new KineticEssence({
      // transform KSON to KineticObject
      transform(chunk, enc, callback) {
        if (chunk instanceof KineticObject) return callback(null, chunk)

        // convert to KineticObject
        buffer += chunk
        lines = buffer.split(/\r?\n/)
        if (lines.length)
          buffer = lines.pop()
        for (let line of lines.filter(Boolean)) {
          try {
            let ko = KineticObject.fromKSON(line)
            self.write(this.mark(ko))
          } catch (e) {
            self.error(e)
          }
        }
        callback()
      }
    })
    this.on('data', ko => {
      if (!passthrough && wrapper.seen(ko)) return
      if (/^module\//.test(ko.key) || [ 'kos', 'error', 'info', 'debug' ].includes(ko.key)) return
      wrapper.push(ko.toKSON() + "\n")
    })
    return wrapper
  }

  // get data for key(s) from up the hierarchy if not in local state
  fetch(...keys) {
    if (keys.every(x => this.state.has(x))) 
      return this.state.get(...keys)
    if (this.state.has('parent')) {
      let parent = this.state.get('parent')
      return parent.fetch(...keys)
    }
  }

  // set data for key/value up one hierarchy-level
  post(key, value) {
    if (this.state.has('parent')) {
      let { state } = this.state.get('parent')
      if (state && state.has(key)) {
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
  
  //
  // Inspection and Logging
  //

  get type() { return this.constructor.name }

  get identity() { return this.id }

  get error() { return this.throw }

  log(type, ...args) {
    this.push(new KineticObject(type, this.identity + ' ' + args.join(' '), this.id))
  }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }

  // send error
  throw(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticObject('error',err, this.id))
    return err
  }

  inspect() {
    return {
      id:    this.id,
      type:  this.type,
      state: Array.from(this.state)
    }
  }

  toJSON() { 
    let json = this.inspect()
    delete json.state
    return json
  }

}

module.exports = KineticEssence
