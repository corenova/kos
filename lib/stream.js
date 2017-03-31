'use strict';

try { var debug = require('debug')('kos:stream') }
catch (e) { var debug = () => {} }

const uuid = require('uuid')
const { Transform, Duplex } = require('stream')

const KineticObject = require('./object')

class KineticStream extends Transform {

  get [Symbol.toStringTag]() { return 'KineticStream' }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return true
  // }

  constructor(options={}) {
    if (options instanceof KineticStream) {
      options = options.inspect()
    }
    options.objectMode = true

    super(options)

    this.id = uuid()

    if (options.state instanceof Map)
      this.state = options.state
    else
      this.state = new Map(options.state)
    
    this.buffer = ''
    this.on('end', this.warn.bind(this, 'kinetic stream died unexpectedly'))

    options.maxListeners && this.setMaxListeners(options.maxListeners)
  }

  // Kinetic Transform Implementation
  //
  // Basic enforcement of chunk to be KineticObject
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, callback) {
    if (!(chunk instanceof KineticObject)) {
      return callback(new Error("chunk is not a KineticObject"))
    }

    // ignore chunks it's seen before, otherwise mark it and send it along
    this.seen(chunk) ? callback() : callback(null, this.mark(chunk))
  }

  setState(key='', value) {
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
    if (!(stream instanceof KineticStream))
      throw new Error("[join] can only join to other KineticStreams, sorry", stream)
    this.state.set('parent', stream)
    return this
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, ...values) {
    for (const value of values)
      this.write(new KineticObject(key, value))
    return this
  }

  // A special "wrapper" method that creates a new KineticStream
  // stream around the current stream instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from KineticObjects.
  //
  // It also offers "passthrough" flag (default false) which if set to
  // true will allow the SAME incoming chunk to going out the other
  // end. This should be used with care since piping via passthrough
  // MAY result in infinite loop across flow instances.
  io(opts={}) {
    let { passthrough = false, verbose = 0 } = opts
    let self = this
    let buffer = ''
    let lines = []
    let wrapper = new KineticStream({
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
            let ko = KineticObject.fromKSON(line.trim())
            debug('io:write', ko.key)
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
      if (/^module\//.test(ko.key) || [ 'flow', 'error', 'warn', 'info', 'debug' ].includes(ko.key)) return
      debug('io:push', ko.key)
      wrapper.push(ko.toKSON() + "\n")
    })
    return wrapper.join(this)
  }

  filter(...keys) {
    let triggers = new Set(keys)
    return this.pipe(new KineticStream({
      transform(ko, enc, cb) {
        ko && ko.match(triggers) ? cb(null, ko) : cb()
      }
    }))
  }

  // get data for key(s) from up the hierarchy if not in local state
  fetch(...keys) {
    let res = keys.map(key => {
      if (this.state.has(key)) 
        return this.state.get(key)
      if (this.state.has('parent')) 
        return this.state.get('parent').fetch(key)
      return null
    })
    return res.length > 1 ? res : res[0]
  }

  // set data for key/value up one hierarchy-level
  post(key, value) {
    if (this.state.has('parent')) {
      let { state } = this.state.get('parent')
      if (state && state.has(key)) {
        let v = state.get(key)
        if (v instanceof Set) return v.add(value)
      }
      state.set(key, value)
    }
  }

  // TODO: should we allow undefined/null value?

  //
  // Inspection and Logging
  //

  get type() { return Symbol.for('kinetic.stream') }

  get identity() { return this.id }

  log(type, ...args) {
    this.push(new KineticObject(type, [ this.identity, ...args ], this.id))
  }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }
  warn()  { this.log('warn', ...arguments) }

  // send error
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticObject('error',err, this.id))
    return err
  }

  // throw error
  //throw() { throw this.error(...arguments) }
  get throw() { return this.error }

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

module.exports = KineticStream
