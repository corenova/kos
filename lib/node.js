'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const Yang = require('yang-js');
const Neural = require('./neural');
const Pulse = require('./pulse');

const kCore = Symbol.for('kos:core');
const kSchema = Symbol.for('kos:schema');

const Schema = {
  get kind() { return 'anydata'; },
  get node() { return false; },
  
  bind(x) { return this.binding = x; },
  apply(x) { return x; },
  locate(x) { return this; },
  lookup(x) { return this; },
}

class Node extends Neural.Node {
  get [Symbol.toStringTag]() { return `Node:${this.uri}` }
  get type()  { return Symbol.for('kos:node') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get core() { return this[kCore]; }
  get filter() { return false; }
  
  get schema() { return this[kSchema]; }
  set schema(x) { 
    if (x instanceof Yang) {
      this[kSchema] = x;
      x.apply(this); // apply schema to this
      // TODO: handle schema change
    } else {
      this[kSchema] = new Schema(x);
      this[kSchema].bind(x.trigger);
    }
  }
  constructor(schema, opts) {
    (schema instanceof Yang) ? super(opts) : super(schema);
    this[kCore] = new Map;
    this.schema = schema;
  }
  use(key) {
    debug(`${this.uri} use feature '${key}' in [${Array.from(this.depends).map(d => d.datakey)}]`)
    let feature = this.core.get(this.lookup('feature', key))
    if (!feature)
      throw this.error(`unable to use feature '${key}' not found in depends`)
    return feature
  }
  feed(topic, ...values) {
    this.write(this.make(topic, ...values));
    return this;
  }
  activate(pulse, done) {
    if (!(pulse instanceof Pulse)) {
      throw this.error('Node can only process Pulse objects');
    }
    if (pulse.tagged(this)) return false;
    else pulse.tag(this);
    
    const { topic, schema, data } = pulse
    // if (data === null || typeof data === 'undefined') { 
    //   this.core.delete(schema)
    //   return false 
    // }
    if (!this.enabled) return false
    if (!this.consumes.has(schema)) return false

    if (this.filter) {
      // check if pulse data conforms to the consumes filter option
      const opts = this.consumes.get(schema)
      switch (opts.filter) {
      case 'object': if (Array.isArray(data)) return false;
        break;
      case 'array':  if (!Array.isArray(data)) return false;
        break;
      }
    }
    debug(`${this.uri} <== ${topic}`)
    this.core.set(schema, pulse);
    return this.ready;
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
  inspect() {
    const { name, uri, summary, depends, consumes, produces } = this;
    return Object.assign(super.inspect(), {
      name, uri, summary,
      depends: Array.from(depends).map(x => x.datapath),
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
