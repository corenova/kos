'use strict';

const debug = require('debug')('kos:stream')
const uuid = require('uuid')
const { Transform } = require('stream')

const KineticToken = require('./token')

class KineticStream extends Transform {

  get [Symbol.toStringTag]() { return 'KineticStream' }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return lho instanceof Transform && lho.state instanceof Map
  // }

  constructor(options={}) {
    if (options instanceof KineticStream) {
      options = options.inspect()
      delete options.id
    }
    options.objectMode = true
    delete options.transform // disallow override for default transform

    super(options)
    this.id = options.id || uuid()
    if (options.filter instanceof Function)
      this.filter = options.filter

    if (options.state instanceof Map)
      this.state = options.state
    else
      this.state = new Map(options.state)

    this._buffer = ''
    this.on('end', this.warn.bind(this, 'kinetic stream died unexpectedly'))

    options.maxListeners && this.setMaxListeners(options.maxListeners)
  }

  clone() { return new this.constructor(this) }

  // Kinetic Transform Implementation
  //
  // Basic enforcement of chunk to be KineticToken
  // If not KineticToken, treats as KSON text stream
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, callback) {
    if (chunk instanceof KineticToken) {
      // accept if it hasn't been seen before and allowed by the filter
      if (!this.seen(chunk) && this.filter(chunk)) 
        this.push(this.mark(chunk))
    } else {
      // transform KSON to KineticToken
      this._buffer += chunk
      let lines = this._buffer.split(/\r?\n/)
      if (lines.length)
        this._buffer = lines.pop()
      for (let line of lines.filter(Boolean)) {
        try { chunk = KineticToken.fromKSON(line.trim()) }
        catch (e) { chunk = new KineticToken('error', e) }
        this.filter(chunk) && this.push(this.mark(chunk))
      }
    }
    callback()
  }

  filter(token) { return true }

  // setup initial state (can be called multiple times)
  init(key='', value) {
    if (key.constructor === Object)
      for (let k in key)
        this.state.set(k, key[k])
    else
      this.state.set(key, value)
    return this
  }

  seen(token) { return token.tags.has(this.id) }
  mark(token, status) { return token.tag(this.id, status) }

  join(stream) {
    if (!(stream instanceof KineticStream))
      throw new Error("[join] can only join to other KineticStreams, sorry", stream)
    this.parent = stream
    return this
  }

  get parent()  { return this.state.get('parent') }
  set parent(x) { return this.state.set('parent', x) }

  // Convenience function for injecting KineticToken into Writable stream
  feed(key, ...values) {
    for (const value of values)
      this.write(new KineticToken(key, value))
    return this
  }

  // A special "wrapper" method that creates a new KineticStream
  // stream around the current stream instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from KineticTokens.
  //
  // It also offers "passthrough" flag (default false) which if set to
  // true will allow the SAME incoming chunk to going out the other
  // end. This should be used with care since piping via passthrough
  // MAY result in infinite loop across reactor instances.
  io(opts={}) {
    const { passthrough = false } = opts
    const self = this
    const wrapper = new KineticStream({
      filter: token => {
        debug('io:write', token.key, this)
        this.write(wrapper.mark(token))
        return false
      }
    })
    this.on('data', token => {
      if (!passthrough && wrapper.seen(token)) return
      if (token.match([ 'module/*', 'error', 'warn', 'info', 'debug' ])) return
      debug('io:push', token.key)
      wrapper.push(token.toKSON() + "\n")
    })
    return wrapper.join(this)
  }

  // TODO: pending deprecation
  // set data for key/value up one hierarchy-level
  post(key, value) {
    if (this.parent) {
      let { state } = this.parent
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
    this.push(new KineticToken(type, [ this.identity, ...args ], this.id))
  }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }
  warn()  { this.log('warn', ...arguments) }

  // send error
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticToken('error',err, this.id))
    return err
  }

  // throw error
  //throw() { throw this.error(...arguments) }
  get throw() { return this.error }

  inspect() {
    return {
      id:     this.id,
      type:   this.type,
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
