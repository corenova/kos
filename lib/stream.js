'use strict';

const debug = require('debug')('kos:stream')
const uuid = require('uuid')
const delegate = require('delegates')
const { Transform } = require('stream')

const KineticToken = require('./token')
const DEFAULT_HIGH_WATERMARK = 100

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
    this.on('end', () => debug(`kinetic stream ${this.id} ended`))

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
      // send along if it hasn't been seen before and allowed by the filter
      if (this.seen(chunk)) return callback()

      try {
        this.filter(this.mark(chunk)) && this.push(chunk)
        callback()
      } catch (e) {
        if (e.method === 'push') {
          this.read(0) // re-initiate reading from this stream
          this.once('data', () => {
            console.error("readable data has been read, resume next transform")
            callback(null, e.chunk)
          })
        }
      }
    } else {
      // transform KSON to KineticToken
      this._buffer += chunk
      let lines = this._buffer.split(/\r?\n/)
      if (lines.length)
        this._buffer = lines.pop()
      for (let line of lines.filter(Boolean)) {
        try { chunk = KineticToken.fromKSON(line.trim()) }
        catch (e) { chunk = new KineticToken('error').add(e) }
        this.filter(this.mark(chunk)) && this.push(chunk)
        //this.filter(chunk) && this.push(this.mark(chunk))
      }
      callback()
    }
  }

  filter(token) { return true }

  // setup initial state (can be called multiple times)
  init(key='', value) {
    if (key.constructor === Object)
      for (let k in key)
        this.set(k, key[k])
    else
      this.set(key, value)
    return this
  }

  seen(token) { return token.tags.has(this.id) }
  mark(token, status) { return token.tag(this.id, status) }

  join(stream) {
    if (!(stream instanceof KineticStream))
      throw new Error("[join] can only join to other KineticStreams, sorry", stream)
    // XXX - handle when it was already joined to another parent before
    this.parent = stream
    this.on('dirty', this.emit.bind(stream)) // propagation to parent
    return this
  }

  // Convenience function for injecting KineticToken into Writable stream
  feed(key, ...values) {
    this.write(new KineticToken(key).add(...values))
    return this
  }
  // Convenience function for injecting KineticToken into Readable stream
  send(key, ...values) { return this.push(new KineticToken(key, this.id).add(...values)) }

  push(chunk) {
    if (!super.push(...arguments)) {
      let err = new Error("unable to push chunk")
      err.flow = this
      err.method = 'push'
      throw err
    }
    return true
  }

  // A special "wrapper" method that creates a new KineticStream
  // stream around the current stream instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from KineticTokens.
  io(opts={}) {
    const self = this
    const wrapper = new KineticStream({
      filter: token => {
        debug('io:write', token.key, this)
        this.write(token)
        return false
      }
    })
    const serialize = token => {
      if (wrapper.seen(token)) return
      if (token.match([ 'module/*', 'error', 'warn', 'info', 'debug' ])) return
      debug('io:push', token.key, this)
      wrapper.push(token.toKSON() + "\n")
    }
    wrapper.on('finish', () => this.removeListener('data', serialize))
    this.on('data', serialize)
    return wrapper.join(this)
  }

  // TODO: pending deprecation
  // set data for key/value up one hierarchy-level
  post(key, value) {
    this.warn("post() method has been deprecated and will be removed soon. simply use this.parent.has/set/get")
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

  get type()     { return Symbol.for('kinetic.stream') }
  get name()     { return this.id }
  get identity() { return this.parent ? this.parent.identity+'/'+this.name : this.name }

  log(type, ...args) {
    this.push(new KineticToken(type, this.id).add([ this.identity, ...args ]))
  }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }
  warn()  { this.log('warn', ...arguments) }

  // send error
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([err].concat(rest).join(' '))
    err.flow = this
    this.push(new KineticToken('error', this.id).add(err))
    return err
  }

  // throw error
  throw() { throw this.error(...arguments) }

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

delegate(KineticStream.prototype, 'state')
  .method('has')
  .method('get')
  .method('set')
  .method('delete')
  .method('keys')

module.exports = KineticStream
