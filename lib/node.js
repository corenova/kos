'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const Yang = require('yang-js');
const Neural = require('./neural');
const Pulse = require('./pulse');

const kProp = Symbol.for('property');
const kSchema = Symbol.for('kos:schema');
const kDepends = Symbol.for('kos:depends');

class Node extends Neural.Node {
  get [Symbol.toStringTag]() { return `Node:${this.uri}` }
  get type()  { return Symbol.for('kos:node') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get filter() { return false; }
  get ready() { return this.enabled; }
  get enabled() { return Array.from(this.depends).every(d => this.core.has(d)); }
  get depends() { return this[kDepends]; }
  set depends(x=[]) {
    const features = [].concat(x)
    for (let feature of features)
      feature.binding && this.core.set(feature, feature.binding)
    this[kDepends] = new Set(features)
  }
  get schema() { return this[kSchema]; }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x);
    if (!(x instanceof Yang))
      throw new Error("Node schema must be an instance of Yang");
    this[kProp] = new Yang.Container(x.datakey, x);
    this[kSchema] = x;
    x.apply(this, this[kProp]); // apply schema to this
    // TODO: handle schema change
  }
  constructor(props={}) {
    props.objectMode = true;
    super(props);
    const { depends, schema } = props;
    this.depends = depends;
    this.schema = schema;
  }
  use(key) {
    debug(`${this.uri} use feature '${key}' in [${Array.from(this.depends).map(d => d.datakey)}]`)
    let feature = this.core.get(this.lookup('feature', key))
    if (!feature)
      throw this.error(`unable to use feature '${key}' not found in depends`)
    return feature
  }
  activate(pulse, done) {
    if (!(pulse instanceof Pulse)) {
      throw this.error('Node can only process Pulse objects');
    }
    if (pulse.tagged(this)) return false;
    else pulse.tag(this);
    
    const { topic, schema, data } = pulse
    if (this.depends.has(schema)) {
      this.core.set(schema, data)
      return false
    }
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
  attach(obj, ctx) {
    if (ctx instanceof Yang.Property) {
      this[kProp].parent = ctx;
      ctx.add(this.name, this[kProp]);
    }
    if (obj instanceof Neural.Layer) return super.attach(obj);
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

delegate(Node.prototype, kProp)
  .method('in')
  .method('get')

module.exports = Node
