'use strict';

const debug = require('./debug').extend('persona');
const delegate = require('delegates');

const { Layer } = require('./neural'); // should remove?
const Node = require('./node');
const Filter = require('./filter');
const Pulse = require('./pulse');

const kFlow = Symbol.for('kos:flow');
const kSchema = Symbol.for('kos:schema');

class Persona extends Node {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}`; }
  get type()  { return Symbol.for('kos:persona'); }
  
  get ready() { return this.active; }
  get flow() {
    if (!this[kFlow]) {
      this[kFlow] = new Layer({
        objectMode: true, parent: this,
        inflow:  new Filter({ parent: this, filter: x => this.incoming(x) }),
        outflow: new Filter({ parent: this, filter: x => this.outgoing(x) }),
      });
      delegate(this[kFlow], 'parent').access('state');
    }
    return this[kFlow]
  }
  
  constructor(schema, state={}) {
    super(schema);
    this.state = state
    this.flow.pipe(this)
    this.active = false // disabled by default
  }
  feed(topic, ...values) {
    let pulse = this.make(topic, ...values);
    for (let node of this.flow.nodes) {
      node.consumes.has(pulse.schema) && node.write(pulse)
    }
    return this
  }
  //
  // Persona Processing
  //
  activate(pulse, done) {
    if (pulse.tagged(this)) done(null, pulse);
    else {
      super.activate(pulse) && this.flow.write(pulse);
      done();
    }
  }
  incoming(pulse) {
    const { topic, schema } = pulse.tag(this);
    if (!this.consumes.has(schema)) return false;
    debug(`${this.uri} <-- ${topic} (${schema.kind})`);
    if (this.schema.input) {
      const { binding } = this.schema.input;
      if (typeof binding === 'function') {
        return binding.call(this.flow, pulse);
      }
    }
    return true;
  }
  outgoing(pulse) {
    const { topic, schema } = pulse.tag(this);
    if (!this.produces.has(schema)) return false;
    debug(`${this.uri} --> ${topic} (${schema.kind})`);
    if (this.schema.output) {
      const { binding } = this.schema.output;
      if (typeof binding === 'function') {
        return binding.call(this.flow, pulse);
      }
    }
    return true;
  }
}

module.exports = Persona
