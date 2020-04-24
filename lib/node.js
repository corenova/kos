/**
 * @fileoverview Node
 * @author sekur (Peter Lee)
 */
'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const { Container } = require('yang-js');
// local modules
const Context = require('./context');

const Neural = require('./neural');
const Pulse = require('./pulse');
// symbol keys
const kCore = Symbol.for('kos:core');

class Node extends Container {
  
  get [Symbol.toStringTag]() { return `Node:${this.uri}` }
  get type()    { return Symbol.for('kos:node') }
  get core()    { return this.state[kCore]; }
  get istream() { return this.children.get('input'); }
  get ostream() { return this.children.get('output'); }
  get context() {
    let ctx = Object.create(Context)
    ctx.actor = this
    ctx.queue = new Map
    return ctx
  }

  constructor(spec) {
    super(spec);
    this.state[kCore] = new Transform({
      objectMode: true,
      transform: (data, enc, done) => this.activate(data, done),
    });
    
  }

  activate(pulse, done) {

  }

  bind(transform) {
    const {
      consumes = [],
      produces = [],
      activate
    } = transform;
    consumes.every(ref => this.in(ref))
  }
  

  use(key) {
    debug(`${this.uri} use feature '${key}' in [${Array.from(this.depends).map(d => d.datakey)}]`)
    let feature = this.depends.get(this.lookup('feature', key))
    if (!feature)
      throw this.error(`unable to use feature '${key}' not found in depends`)
    return feature
  }
  // overload core.update to handle Pulse
  update(pulse) {
    if (!(pulse instanceof Pulse)) return false;
    if (pulse.tagged(this)) return false;
    else pulse.tag(this);
    
    const { topic, schema, data } = pulse;
    if (!super.update(schema, data)) return false;
    
    debug(`${this.uri} <== ${topic}`)
    this.set(schema, pulse); // override what's saved in the core
    return this.ready;
  }
  make(topic, ...values) {
    return new Pulse(topic, this).add(...values);
  }
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse);
    else this.log('warn', `${pulse.topic} is not one of produced schemas`, pulse);
  }
  isCompatible(node) {
    for (const [output] of this.produces)
      for (const [input] of node.consumes)
        if (output === input) return !output.node;
    return false;
  }
}

module.exports = Node;
