'use strict';

const debug = require('debug')('kos:channel')
const uuid = require('uuid')
const { Transform } = require('stream')

const Pulse = require('./pulse')

const DEFAULT_HIGH_WATERMARK = 100
// default value for maximum number of embedded channels within the Channel
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const DEFAULT_MAX_LISTENERS = 30

class Channel extends Transform {

  get [Symbol.toStringTag]() { return `Channel:${this.id}` }
  get type() { return Symbol.for('kos:channel') }

  // TODO: use Symbol to override instanceof behavior
  // static [Symbol.hasInstance](lho) {
  //   return lho instanceof Transform && lho.state instanceof Map
  // }

  constructor(props={}) {
    const {
      id = uuid(), filter, transform,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners = DEFAULT_MAX_LISTENERS
    } = props

    super({ transform, highWaterMark, objectMode: true })

    this.id = id
    if (typeof filter === 'function')
      this.filter = filter.bind(this)
    maxListeners && this.setMaxListeners(maxListeners)
  }

  // Channel Transform Implementation
  //
  // Basic enforcement of chunk to be Pulse
  // Also prevents circular loop by rejecting objects it's seen before
  filter(pulse) { return true }
  
  _transform(chunk, enc, done) {
    if (chunk instanceof Pulse) {
      // send along if it hasn't been seen before and allowed by the filter
      if (chunk.tagged(this)) return done()

      try {
        this.filter(chunk.tag(this)) && this.push(chunk)
        done()
      } catch (e) {
        if (e.method === 'push') {
          this.read(0) // re-initiate reading from this channel
          this.once('data', () => {
            debug(`${this} readable data has been read, resume next transform`)
            done(null, e.chunk)
          })
        } else throw this.error(e)
      }
    } else done(this.error('incompatible Pulse received in Channel'))
  }
  feed(key, ...values) {
    this.write(new Pulse(key, this).add(...values))
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
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([...arguments].join(' '))
    err.origin = this
    //this.send('error', err)
    return err
  }
  inspect() {
    const { id, type } = this
    return { id, type }
  }
  // A special "wrapper" method that creates a new Channel instance
  // around the current Channel instance. It provides compatibility
  // interface with non-KOS streams by transforming incoming/outgoing
  // chunks to/from Pulse.
  get io() {
    let buffer = ''
    const wrapper = new Channel({
      transform: (chunk, encoding, done) => {
        if (chunk instanceof Pulse) {
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
              let token = Pulse.fromKSON.call(this, line.trim())
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

module.exports = Channel
