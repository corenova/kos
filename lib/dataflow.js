'use strict';

const debug = require('debug')('kos:dataflow')
const uuid = require('uuid')
const { Transform } = require('stream')

const Stimulus = require('./stimulus')
const DEFAULT_HIGH_WATERMARK = 100

class Dataflow extends Transform {

  get [Symbol.toStringTag]() { return 'Dataflow' }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return lho instanceof Transform && lho.state instanceof Map
  // }

  constructor(props={}) {
    if (props instanceof Dataflow) {
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
    props.maxListeners && this.setMaxListeners(props.maxListeners)
  }

  clone(state, opts) { return (new this.constructor(this)).save(state, opts) }

  // Dataflow Transform Implementation
  //
  // Basic enforcement of chunk to be Stimulus
  // If not Stimulus, treats as KSON text dataflow
  // Also prevents circular loop by rejecting objects it's seen before
  _transform(chunk, enc, done) {
    if (chunk instanceof Stimulus) {
      // send along if it hasn't been seen before and allowed by the filter
      if (this.seen(chunk)) return done()

      try {
        this.filter(this.mark(chunk)) && this.push(chunk)
        done()
      } catch (e) {
        if (e.method === 'push') {
          this.read(0) // re-initiate reading from this dataflow
          this.once('data', () => {
            debug(this.identity, "readable data has been read, resume next transform")
            done(null, e.chunk)
          })
        } else this.send('error', e)
        throw e
      }
    } else {
      // transform KSON to Stimulus
      this._buffer += chunk
      let lines = this._buffer.split(/\r?\n/)
      if (lines.length)
        this._buffer = lines.pop()
      for (let line of lines.filter(Boolean)) {
        try { chunk = Stimulus.fromKSON(line.trim()) }
        catch (e) { chunk = new Stimulus('error').add(e) }
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

  seen(stimulus) { return stimulus.tags.has(this.id) }
  mark(stimulus, status) { return stimulus.tag(this.id, status) }

  get parent()  { return this.props.parent }
  set parent(x) { this.props.parent = x }

  join(flow) {
    if (!(flow instanceof Dataflow))
      throw new Error("[join] can only join other Dataflows", flow)
    // XXX - handle when it was already joined to another parent before
    this.parent = flow.link(this)
    this.on('adapt', this.emit.bind(flow)) // propagation to parent
    return this
  }
  
  leave(flow=this.parent) {
    if (!(flow instanceof Dataflow))
      throw new Error("[leave] can only leave other Dataflows", flow)
    if (this.parent === flow) {
      this.parent = null
      this.pause()
      flow.unlink(this)
    }
    // XXX - stop propagation to prior parent...
    return this
  }

  link(flow) {
    this.pipe(flow); flow.pipe(this)
    return this
  }

  unlink(flow) {
    this.unpipe(flow); flow.unpipe(this)
    return this
  }

  // Chain Dataflow(s) from/to the current Dataflow
  //
  // Chaining is a convenience method to emulate following logic:
  //
  // this.pipe(DataflowA).pipe(DataflowB).pipe(DataflowC).pipe(this)
  // 
  // Basically, the collective outputs from the *chained* Dataflows are
  // piped back as new inputs into each of the respective streams
  // (including the current Dataflow).
  //
  // Usually, such operations on standard Node.js Dataflows may result in an
  // infinite loop, but Dataflows ensures ONE-TIME processing of
  // a given Stimulus.
  chain(...flows) {
    // TODO: should we validate that the streams are instances of Dataflow?
    let tail = flows.reduce(((a, b) => a.pipe(b)), this)
    tail && tail.pipe(this)
    return this
  }

  pipe(flow) {
    if (!this._flows.has(flow)) {
      this._flows.add(flow)
      this.emit('adapt', flow)
      try { return super.pipe(flow) }
      catch (e) { return flow }
    }
    return flow
  }

  unpipe(flow) {
    if (this._flows.has(flow)) {
      this._flows.delete(flow)
      this.emit('adapt', flow)
      try { return super.unpipe(flow) }
      catch (e) { return }
    }
  }

  // Convenience function for writing Stimulus into Writable stream
  feed(key, ...values) {
    this.write(new Stimulus(key).add(...values))
    return this
  }
  // Convenience function for pushing Stimulus into Readable stream
  send(key, ...values) { return this.push(new Stimulus(key, this.id).add(...values)) }

  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = new Error(`unable to push chunk: ${chunk}`)
      err.origin = this
      err.method = 'push'
      throw err
    }
    return true
  }

  // A special "wrapper" method that creates a new Dataflow
  // instance around the current flow instance. It provides
  // compatibility interface with non-KOS streams by transforming
  // incoming/outgoing chunks to/from Stimulus.
  io(opts={}) {
    const self = this
    const wrapper = new Dataflow({
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
  // Inspection
  //

  get type()     { return Symbol.for('kos:dataflow') }
  get label()    { return this.id }
  get identity() { return this.parent ? this.parent.identity+'/'+this.label : this.label }
  get props()    { return this._props }
  get flows()    { return this._flows }

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

module.exports = Dataflow
