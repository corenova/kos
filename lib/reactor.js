'use strict';

const debug = require('./debug').extend('reactor');
const delegate = require('delegates');
const Yang = require('yang-js');
// local modules
const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');
const State = require('./state');
// symbol keys
const kModel = Symbol.for('kos:model');
const kSchema = Symbol.for('kos:schema');

class Reactor extends Neural.Layer {

  get [Symbol.toStringTag]() { return `Reactor:${this.uri}`; }
  get type()  { return Symbol.for('kos:reactor'); }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get model() { return this[kModel]; }
  get schema() { return this[kSchema]; }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x);
    if (!(x instanceof Yang))
      throw new Error("Reactor schema must be an instance of Yang");
    this[kModel] = new State(x);
    this[kSchema] = x;
    Object.preventExtensions(this);
    x.apply(this, this[kModel]); // apply schema to this
    // TODO: handle schema change
  }
  set config(x) { this.set(x).commit(); }
  get config()  { this.get();  }

  get context() {
    const ctx = Object.create(Context);

    // TODO: this actor can't really push/make, what to do?
    ctx.actor = this;
    ctx.opts = { actor: this };
    
    ctx.node = this.model; // context is the parent reactor's data model
    ctx.queue = new Map;
    return ctx;
  }
  
  constructor(props={}) {
    const {
      enabled = false,
      inflow =  new Filter({ filter: x => this.incoming(x) }),
      outflow = new Filter({ filter: x => this.outgoing(x) }),
      schema, config = {}
    } = props;
    
    super(Object.assign(props, {
      enabled, inflow, outflow,
      objectMode: true,
    }));
    
    this.schema = schema;
    this.config = config;
  }
  feed(topic, ...values) {
    const pulse = new Pulse(topic, this).add(...values);
    for (let node of this.nodes) {
      node.consumes.has(pulse.schema) && node.write(pulse);
    }
    return this;
  }
  make(topic, mode) {
    return new Pulse(topic, this, mode);
  }
  //
  // Reactor Processing
  //
  incoming(pulse) {
    const { topic, schema } = pulse;
    const accept = this.active && this.consumes.has(schema);
    accept && debug(`${this.uri} <-- ${topic} (${schema.kind})`);
    pulse.tag(this);
    return accept;
  }
  outgoing(pulse) {
    const { topic, schema, data } = pulse;
    const accept = this.active && this.produces.has(schema);
    accept && debug(`${this.uri} --> ${topic} (${schema.kind})`);
    pulse.tag(this);
    return accept;
  }
  attach(obj, ctx) {
    if (ctx instanceof Yang.Property) {
      this.model.parent = ctx;
      ctx.add(this.model);
    }
    if (obj instanceof Neural.Layer) return super.attach(obj);
    return obj;
  }
  inspect() {
    const { id, type, name, uri, summary, consumes, produces, nodes, links } = this
    return {
      id, type, name, uri, summary,
      consumes: Array.from(consumes.keys()).map(x => x.datapath),
      produces: Array.from(produces.keys()).map(x => x.datapath),
      nodes, links
    }
  }
}

delegate(Reactor.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('description')
  .getter('tag')
  .getter('kind')
  .method('locate')
  .method('lookup')

delegate(Reactor.prototype, kModel)
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

module.exports = Reactor;
