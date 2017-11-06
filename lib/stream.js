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

  constructor(props={}) {
    if (props instanceof KineticStream) {
      props = props.inspect()
      delete props.id
    }
    if (!props.highWaterMark)
      props.highWaterMark = DEFAULT_HIGH_WATERMARK
    props.objectMode = true
    delete props.transform // disallow override for default transform

    super(props)
    this.id = props.id || uuid()
    if (props.filter instanceof Function)
      this.filter = props.filter

    if (props.state instanceof Map)
      this.state = props.state
    else
      this.state = new Map(props.state)

    this._props = props
    this._streams = new Set
    this._buffer = ''
    this.on('end', () => debug(this.identity, "ended"))
    //this.on('error', this.throw.bind(this))
    props.maxListeners && this.setMaxListeners(props.maxListeners)
  }

  clone(state, opts) { return (new this.constructor(this)).save(state, opts) }

  // Kinetic Transform Implementation
  //
  // Basic enforcement of chunk to be KineticToken
  // If not KineticToken, treats as KSON text stream
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, done) {
    if (chunk instanceof KineticToken) {
      // send along if it hasn't been seen before and allowed by the filter
      if (this.seen(chunk)) return done()

      try {
        this.filter(this.mark(chunk)) && this.push(chunk)
        done()
      } catch (e) {
        if (e.method === 'push') {
          this.read(0) // re-initiate reading from this stream
          this.once('data', () => {
            debug(this.identity, "readable data has been read, resume next transform")
            done(null, e.chunk)
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
        // XXX: should be wrapped in try/catch?
        this.filter(this.mark(chunk)) && this.push(chunk)
      }
      done()
    }
  }

  filter(token) { return true }

  // setup initial state (clean-slate)
  init(state) {
    this.state.clear()
    this.save(state, { emit: false })
    return this
  }

  // save updated state
  save(state, opts={}) {
    const { emit = true } = opts
    if (typeof state === "object") {
      const keys = Object.keys(state)
      for (let k of keys) {
        this.set(k, state[k])
      }
      if (emit) this.emit("save", state)
    }
    return this
  }

  seen(token) { return token.tags.has(this.id) }
  mark(token, status) { return token.tag(this.id, status) }

  get parent()  { return this.props.parent }
  set parent(x) { this.props.parent = x }

  join(stream) {
    if (!(stream instanceof KineticStream))
      throw new Error("[join] can only join other KineticStreams, sorry", stream)
    // XXX - handle when it was already joined to another parent before
    this.parent = stream.link(this)
    this.on('adapt', this.emit.bind(stream)) // propagation to parent
    return this
  }
  
  leave(stream) {
    if (!(stream instanceof KineticStream))
      throw new Error("[leave] can only leave other KineticStreams, sorry", stream)
    if (this.parent === stream) {
      this.parent = null
      this.pause()
      stream.unlink(this)
    }
    // XXX - stop propagation to prior parent...
    return this
  }

  link(stream) {
    this.pipe(stream); stream.pipe(this)
    return this
  }

  unlink(stream) {
    this.unpipe(stream); stream.unpipe(this)
    return this
  }

  // Chain KineticStream(s) from/to the current KineticStream
  //
  // Chaining is a convenience method to emulate following logic:
  //
  // this.pipe(StreamA).pipe(StreamB).pipe(StreamC).pipe(this)
  // 
  // Basically, the collective outputs from the *chained* Streams are
  // piped back as new inputs into each of the respective Streams
  // (including the current Stream).
  //
  // Usually, such operations on standard streams may result in an
  // infinite loop, but KineticStreams ensures ONE-TIME processing of
  // a new Token.
  chain(...streams) {
    // TODO: should we validate that the streams are instances of KineticStream?
    let tail = streams.reduce(((a, b) => a.pipe(b)), this)
    tail && tail.pipe(this)
    return this
  }

  pipe(stream) {
    if (!this._streams.has(stream)) {
      this._streams.add(stream)
      this.emit('adapt', stream)
    }
    return super.pipe(stream)
  }

  unpipe(stream) {
    if (this._streams.has(stream)) {
      this._streams.delete(stream)
      this.emit('adapt', stream)
    }
    return super.unpipe(stream)
  }

  // Convenience function for writing KineticToken into Writable stream
  feed(key, ...values) {
    this.write(new KineticToken(key).add(...values))
    return this
  }
  // Convenience function for pushing KineticToken into Readable stream
  send(key, ...values) { return this.push(new KineticToken(key, this.id).add(...values)) }

  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = new Error(`unable to push chunk: ${chunk}`)
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
      parent: this,
      filter: token => {
        //debug(this.identity, 'io:write', token.key, token)
        this.write(token)
        return false
      }
    })
    const serialize = token => {
      if (wrapper.seen(token)) return
      if (token.match([ 'module/*', 'error', 'warn', 'info', 'debug' ])) return
      //debug(this.identity, 'io:push', token.key, token.value)
      wrapper.push(token.toKSON() + "\n")
    }
    wrapper.on('finish', () => this.removeListener('data', serialize))
    this.on('data', serialize)
    return wrapper
  }

  // STATE interaction overloads
  has(key) {
    // TODO: consider supporting key as wildcard match?
    return this.state.has(key) || (this.parent ? this.parent.has(key) : false)
  }

  get(key) {
    if (this.state.has(key)) return this.state.get(key)
    if (this.parent) return this.parent.get(key)
  }

  // TODO: should we allow undefined/null value?

  //
  // Inspection and Logging
  //

  get type()     { return Symbol.for('kinetic.stream') }
  get label()    { return this.id }
  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }
  get props()    { return this._props }

  log(type, ...args) {
    try { this.push(new KineticToken(type, this.id).add([ this.identity, ...args ])) }
    catch (e) {

    }
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
  .method('set')    // only local
  .method('delete') // only local

module.exports = KineticStream
