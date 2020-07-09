'use strict';

const debug = require('./debug').extend('filter');
const Neural = require('./neural');
const Pulse = require('./pulse');

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
  filter(pulse) { return false; }
  async activate(pulse, done) {
    if (pulse instanceof Pulse) {
      // send along if it hasn't been seen before and allowed by the filter
      if (!pulse.tagged(this)) {
	(await this.filter(pulse.tag(this))) && this.push(pulse);
      }
      done()
    } else done(this.error('incompatible chunk received in Filter'))
  }
  inspect() {
    const { id, type } = this
    return { id, type }
  }
}

module.exports = Filter
