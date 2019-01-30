'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const Yang = require('yang-js');
const Neural = require('./neural');
const Pulse = require('./pulse');

const kSchema = Symbol.for('kos:schema');

class Node extends Neural.Node {
  get [Symbol.toStringTag]() { return `Node:${this.uri}` }
  get type()  { return Symbol.for('kos:node') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x);
    if (!(x instanceof Yang))
      throw new Error("Node schema must be an instance of Yang");
    this[kSchema] = x;
    x.apply(this); // apply schema to this
    // TODO: handle schema change
  }
  constructor(schema) {
    super({ objectMode: true });
    this.schema = schema;
  }
  activate(pulse, done) {
    if (!(pulse instanceof Pulse)) {
      throw this.error('Node can only process Pulse objects');
    }
    if (pulse.tagged(this)) return false;
    pulse.tag(this);
    return true;
  }
  join(obj, ctx={}) {
    if (obj instanceof Neural.Layer) return super.join(obj);
    return obj;
  }
  make(topic, ...values) {
    return new Pulse(topic, this).add(...values);
  }
  isCompatible(node) {
    for (let [output] of this.produces)
      for (let [input] of node.consumes)
        if (output === input) return !output.node;
    return false ;
  }
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse);
    else throw this.error(`${pulse.topic} is not one of produced schemas`, pulse);
  }
  inspect() {
    const { name, uri, summary, consumes, produces } = this;
    return Object.assign(super.inspect(), {
      name, uri, summary,
      consumes: Array.from(consumes.keys()).map(x => x.datapath),
      produces: Array.from(produces.keys()).map(x => x.datapath)
    });
  }
}

delegate(Node.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .getter('binding')
  .method('bind')
  .method('locate')
  .method('lookup')

module.exports = Node
