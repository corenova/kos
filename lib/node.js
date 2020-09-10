'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const Yang = require('yang-js');
// local modules
const Neural = require('./neural');
const Pulse = require('./pulse');
// symbol keys
const kSchema = Symbol.for('kos:schema');
const kProp = Symbol.for('property');

class Node extends Neural.Node {
  
  get [Symbol.toStringTag]() { return `Node:${this.uri}` }
  get type()  { return Symbol.for('kos:node') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get prop() { return this[kProp]; }
  get schema() { return this[kSchema]; }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x);
    if (!(x instanceof Yang))
      throw new Error("Node schema must be an instance of Yang");
    this[kProp] = new Yang.Container(x);
    this[kSchema] = x;
    x.apply(this, this[kProp]); // apply schema to this
    // TODO: handle schema change
  }
  constructor(props={}) {
    props.objectMode = true;
    super(props);
    this.schema = props.schema;
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
    if (!(pulse instanceof Pulse)) {
      throw this.error('Node can only process Pulse objects');
    }
    if (pulse.tagged(this)) return false;
    else pulse.tag(this);
    
    const { topic, schema, data } = pulse;
    if (!super.update(schema, data)) return false;
    
    debug(`${this.uri} <== ${topic}`)
    this.core.set(schema, pulse); // override what's saved in the core
    return this.ready;
  }
  make(topic, mode) {
    return new Pulse(topic, this, mode);
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
  attach(obj, ctx) {
    if (ctx instanceof Yang.Container) {
      this.prop.parent = ctx;
      ctx.add(this.name, this.prop);
    }
    if (obj instanceof Neural.Layer) return super.attach(obj);
    return obj;
  }
  inspect() {
    const { name, uri, summary, depends, consumes, produces } = this;
    return Object.assign(super.inspect(), {
      name, uri, summary,
      depends: Array.from(depends.keys()).map(x => x.datapath),
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
