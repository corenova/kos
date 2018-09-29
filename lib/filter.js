'use strict';

const debug = require('debug')('kos:filter')
const uuid = require('uuid')

const Neural = require('./neural')
const Pulse = require('./pulse')

class Filter extends Neural.Node {

  get [Symbol.toStringTag]() { return `Filter:${this.id}` }
  get type() { return Symbol.for('kos:filter') }

  constructor(props={}) {
    props = Object.assign({ objectMode: true }, props)
    super(props)
    
    if (typeof props.filter === 'function')
      this.filter = props.filter.bind(this)
  }

  // Filter Activate Implementation
  //
  // Basic enforcement of chunk to be Pulse
  // Also prevents circular loop by rejecting objects it's seen before
  filter(pulse) { return true }
  activate(chunk, done) {
    if (chunk instanceof Pulse) {
      // send along if it hasn't been seen before and allowed by the filter
      if (!chunk.tagged(this)) {
        this.filter(chunk.tag(this)) && this.push(chunk)
      }
      done()
    } else done(this.error('incompatible Pulse received in Filter'))
  }
  inspect() {
    const { id, type } = this
    return { id, type }
  }
  
  // A special "wrapper" method that creates a new Filter instance
  // around the current Filter instance. It provides compatibility
  // interface with non-KOS streams by transforming incoming/outgoing
  // chunks to/from Pulse.
  get io() {
    let buffer = ''
    const wrapper = new Filter({
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

module.exports = Filter
