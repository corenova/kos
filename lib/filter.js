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
}

module.exports = Filter