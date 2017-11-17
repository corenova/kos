'use strict';

const debug = require('debug')('kos:stream')
const uuid = require('uuid')
const { Transform } = require('stream')

const Stimuli = require('./stimuli')
const DEFAULT_HIGH_WATERMARK = 100

class Stream extends Transform {

  get [Symbol.toStringTag]() { return 'Stream' }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return lho instanceof Transform && lho.state instanceof Map
  // }

  constructor(props={}) {
    if (props instanceof Stream) {
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
    this._flows = new Set
    this._buffer = ''
    this.on('end', () => debug(this.identity, "ended"))
    //this.on('error', this.throw.bind(this))
    props.maxListeners && this.setMaxListeners(props.maxListeners)
  }

  clone(state, opts) { return (new this.constructor(this)).save(state, opts) }

  // Stream Transform Implementation
  //
  // Basic enforcement of chunk to be Stimuli
  // If not Stimuli, treats as KSON text stream
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, done) {
    if (chunk instanceof Stimuli) {
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
      // transform KSON to Stimuli
      this._buffer += chunk
      let lines = this._buffer.split(/\r?\n/)
      if (lines.length)
        this._buffer = lines.pop()
      for (let line of lines.filter(Boolean)) {
        try { chunk = Stimuli.fromKSON(line.trim()) }
        catch (e) { chunk = new Stimuli('error').add(e) }
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

  // save updated state if different
  save(state, opts={}) {
    const { emit = true } = opts
    if (typeof state === "object") {
      const keys = Object.keys(state)
      let diff = false
      for (let k of keys) {
        if (this.state.has(k) && 
            this.state.get(k) === state[k]) {
          continue
        }
        diff = true
        this.state.set(k, state[k])
      }
      if (diff && emit) this.emit("save", state)
    }
    return this
  }

  seen(stimuli) { return stimuli.tags.has(this.id) }
  mark(stimuli, status) { return stimuli.tag(this.id, status) }

  get parent()  { return this.props.parent }
  set parent(x) { this.props.parent = x }

  join(stream) {
    if (!(stream instanceof Stream))
      throw new Error("[join] can only join other Streams", stream)
    // XXX - handle when it was already joined to another parent before
    this.parent = stream.link(this)
    this.on('adapt', this.emit.bind(stream)) // propagation to parent
    return this
  }
  
  leave(stream) {
    if (!(stream instanceof Stream))
      throw new Error("[leave] can only leave other Streams", stream)
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

  // Chain Stream(s) from/to the current Stream
  //
  // Chaining is a convenience method to emulate following logic:
  //
  // this.pipe(StreamA).pipe(StreamB).pipe(StreamC).pipe(this)
  // 
  // Basically, the collective outputs from the *chained* Streams are
  // piped back as new inputs into each of the respective streams
  // (including the current Stream).
  //
  // Usually, such operations on standard Node.js Streams may result in an
  // infinite loop, but Streams ensures ONE-TIME processing of
  // a given Stimuli.
  chain(...streams) {
    // TODO: should we validate that the streams are instances of Stream?
    let tail = streams.reduce(((a, b) => a.pipe(b)), this)
    tail && tail.pipe(this)
    return this
  }

  pipe(stream) {
    if (!this._flows.has(stream)) {
      this._flows.add(stream)
      this.emit('adapt', stream)
    }
    return super.pipe(stream)
  }

  unpipe(stream) {
    if (this._flows.has(stream)) {
      this._flows.delete(stream)
      this.emit('adapt', stream)
    }
    return super.unpipe(stream)
  }

  // Convenience function for writing Stimuli into Writable stream
  feed(key, ...values) {
    this.write(new Stimuli(key).add(...values))
    return this
  }
  // Convenience function for pushing Stimuli into Readable stream
  send(key, ...values) { return this.push(new Stimuli(key, this.id).add(...values)) }

  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = new Error(`unable to push chunk: ${chunk}`)
      err.origin = this
      err.method = 'push'
      throw err
    }
    return true
  }

  // A special "wrapper" method that creates a new Stream
  // instance around the current stream instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from Stimuli.
  io(opts={}) {
    const self = this
    const wrapper = new Stream({
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

  // TODO: should we allow undefined/null value?

  //
  // Inspection and Logging
  //

  get type()     { return Symbol.for('kos:stream') }
  get label()    { return this.id }
  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }
  get props()    { return this._props }
  get flows()    { return this._flows }

  log(type, ...args) {
    try { this.push(new Stimuli(type, this.id).add([ this.identity, ...args ])) }
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
    err.origine = this
    this.push(new Stimuli('error', this.id).add(err))
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

module.exports = Stream
