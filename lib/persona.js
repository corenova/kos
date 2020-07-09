'use strict';

const debug = require('./debug').extend('persona');
const delegate = require('delegates');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');
const Reactor = require('./reactor');

const kModel = Symbol.for('kos:model');
const kSchema = Symbol.for('kos:schema');
const kProp = Symbol.for('property'); // hack to tie into Yang model

class Persona extends Neural.Layer {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get consumes() {
    if (!super.consumes.size) {
      let consumes = this.reactors.map(i => i.active ? Array.from(i.consumes) : [])
      super.consumes = [].concat(...consumes);
    }
   return super.consumes;
  }
  get produces() {
    if (!super.produces.size) {
      let produces = this.reactors.map(i => i.active ? Array.from(i.produces) : [])
      super.produces = [].concat(...produces);
    }
    return super.produces;
  }
  
  get reactors() { return this.links.filter(x => x instanceof Reactor) }
  get personas() { return this.links.filter(x => x instanceof Persona) }

  get schema() { return this[kSchema]; }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Persona schema must be an instance of Yang", x);
    if (!(x.kind === 'module'))
      throw this.error(`Persona schema must be a Yang module, not ${x.kind}`);

    this[kSchema] = x;
    this[kProp] = new Yang.Container({ name: '.' });
    this[kModel] = undefined
    Object.preventExtensions(this);
    x.apply(this, this[kProp]);
    
    for (let i of x.import || []) {
      if (i.module.nodes.length)
        new Persona({ schema: i.module }).attach(this);
    }
    debug(`${this.uri} applied schema with ${x.import.length} imports`, x.import.map(i => i.tag));
    // TODO: handle schema change event
  }
  get model() { return this[kModel] }
  set model(m) {
    if (!(m instanceof Yang.Model))
      throw this.error(`model must be an instance of Yang Model`, m);
    if (!(m.schema === this.schema))
      throw this.error(`model must share same underlying schema`);
    
    if (this[kModel] != m) {
      this[kModel] = m;
      this[kProp].parent = m;
      // When model is assigned, we feed initial set of data
      // nodes that this Persona consumes.
      for (let [ schema, opts ] of this.consumes) {
        if (!schema.node) continue;
        let prop = this.in(schema.datapath);
        if (prop && prop.active) {
          const { path, data } = prop;
          this.write(new Pulse(`${path}`, prop).add(data).tag(this));
        }
      }
    }
  }
  get state()  { return this.model.get(); }
  set state(x) { this.model.set(x); }
  
  constructor(props={}) {
    const {
      enabled = true,
      inflow  = new Filter({ filter: x => this.incoming(x) }),
      outflow = new Filter({ filter: x => this.outgoing(x) }),
      schema,
    } = props;
    
    super(Object.assign(props, {
      enabled, inflow, outflow,
      objectMode: true,
    }));

    this.schema = schema;
  }
  at(uri) {
    const schema = this.locate(uri);
    let match = this.reactors.find(x => x.schema === schema);
    if (!match) {
      for (let persona of this.personas) {
        match = persona.at(uri);
        if (match) break;
      }
    }
    return match;
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values));
    return this;
  }
  incoming(pulse) {
    if (pulse.topic === 'kos:runtime') {
      const { store } = pulse.data;
      try { this.model = store.access(this.tag) }
      catch (err) { throw this.error(err) }
      return true;
    }
    return pulse.schema && pulse.schema.node;
  }
  outgoing(pulse) {
    return pulse.schema && pulse.schema.node;
  }
  toJSON() {
    const { id, uri, links } = this
    return {
      id, uri, links: links.map(x => x.toJSON())
    }
  }
}

delegate(Persona.prototype, kSchema)
  .getter('datakey')
  .getter('description')
  .getter('tag')
  .getter('prefix')
  .method('locate')
  .method('lookup')

delegate(Persona.prototype, kModel)
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

module.exports = Persona;

