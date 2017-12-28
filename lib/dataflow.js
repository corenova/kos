'use strict';

const debug = require('debug')('kos:dataflow')
const { Transform } = require('stream')

const Stimulus = require('./stimulus')

const DEFAULT_HIGH_WATERMARK = 100
// default value for maximum number of embedded dataflows within the Dataflow
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const DEFAULT_MAX_LISTENERS = 30

class Dataflow extends Transform {

  get [Symbol.toStringTag]() { return 'Dataflow' }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return lho instanceof Transform && lho.state instanceof Map
  // }

  constructor(props) {
    const {
      filter, transform,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners = DEFAULT_MAX_LISTENERS
    } = props

    super({ transform, highWaterMark, objectMode: true })
    if (filter) this.filter = filter
    maxListeners && this.setMaxListeners(maxListeners)
  }

  // Dataflow Transform Implementation
  //
  // Basic enforcement of chunk to be Stimulus
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
            debug(this.id, "readable data has been read, resume next transform")
            done(null, e.chunk)
          })
        } else throw this.error(e)
      }
    } else done(this.error('incompatible Stimulus received in Dataflow'))
  }

  seen(stimulus)         { return stimulus.has(this.id) }
  mark(stimulus, status) { return stimulus.tag(this.id, status) }

  filter(stimulus) { return true }

  link(flow)   { this.pipe(flow);   flow.pipe(this);   return this }
  unlink(flow) { this.unpipe(flow); flow.unpipe(this); return this }

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

  // Convenience function for writing Stimulus into Writable stream
  feed(key, ...values) {
    this.write(new Stimulus(key).add(...values))
    return this
  }
  // Convenience function for pushing Stimulus into Readable stream
  send(key, ...values) { 
    this.push(new Stimulus(key, this).add(...values)) 
    return this
  }

  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = new Error(`unable to push chunk: ${chunk}`)
      err.origin = this
      err.method = 'push'
      throw err
    }
    return true
  }

  log(type, ...args) {
    if (!(type instanceof Stimulus))
      type = new Stimulus(type, this).add(...args)
    this.emit('log', type)
    this.parent && this.parent.log(type)
  }

  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([...arguments].join(' '))
    err.origin = this
    this.send('error', err)
    debug(err, rest)
    return err
  }

  // throw error
  throw() { throw this.error(...arguments) }

  inspect() {
    const { type } = this
    return { type }
  }

  // A special "wrapper" method that creates a new Dataflow instance
  // around the current Dataflow instance. It provides compatibility
  // interface with non-KOS streams by transforming incoming/outgoing
  // chunks to/from Stimulus.
  get io() {
    let buffer = ''
    const wrapper = new Dataflow({
      transform: (chunk, encoding, done) => {
        if (chunk instanceof Stimulus) {
          if (!wrapper.seen(chunk)) {
            let kson = chunk.toKSON()
            if (kson) {
              debug(`io(${this.identity}) <-- ${chunk.topic}`)
              wrapper.push(kson)
            }
          }
        } else {
          buffer += chunk
          let lines = buffer.split(/\r?\n/)
          if (lines.length)
            buffer = lines.pop()
          for (let line of lines.filter(Boolean)) {
            try { 
              let token = Stimulus.fromKSON.call(this, line.trim())
              debug(`io(${this.identity}) --> ${token.topic}`)
              this.write(wrapper.mark(token)) 
            } catch (e) { this.error(e) }
          }
        }
        done()
      }
    })
    wrapper.parent = this
    return this.pipe(wrapper)
  }
}

module.exports = Dataflow
