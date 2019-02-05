const debug = require('./debug').extend('interface');
const delegate = require('delegates');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');
const Persona = require('./persona');

const kModel = Symbol.for('kos:model');
const kSchema = Symbol.for('kos:schema');
const kProp  = Symbol.for('property'); // hack to tie into Yang model

class Interface extends Neural.Layer {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type() { return Symbol.for('kos:interface') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get personas()   { return this.nodes.filter(x => x instanceof Persona) }
  get interfaces() { return this.links.filter(x => x instanceof Interface) }
  
  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang", x);
    if (!(x.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${x.kind}`);

    this[kSchema] = x;
    this[kProp] = new Yang.Property('.')
    this[kModel] = undefined
    Object.preventExtensions(this);
    x.apply(this, this[kProp].context);

    for (let i of x.import || []) {
      if (i.module.nodes.length)
        new Interface(i.module).join(this);
    }
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
      // nodes that this Interface consumes.
      for (let [ schema, opts ] of this.consumes) {
        if (!schema.node) continue;
        let prop = this.in(schema.datapath);
        if (prop && prop.active) {
          const { path, content } = prop;
          this.write(new Pulse(`${path}`, prop).add(content).tag(this));
        }
      }
    }
  }
  get state()  { return this.model.get(); }
  set state(x) { this.model.set(x); }
  
  constructor(schema) {
    super({
      objectMode: true,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    });
    this.schema = schema;
  }
  at(uri) {
    const schema = this.locate(uri);
    let match = this.nodes.find(x => x.schema === schema);
    if (!match) {
      for (let iface of this.interfaces) {
        match = iface.at(uri);
        if (match) break;
      }
    }
    return match;
  }
  feed(topic, ...values) {
    this.write(this.make(topic, ...values));
    return this;
  }
  make(topic, ...values) {
    return new Pulse(topic, this).add(...values);
  }
  incoming(pulse) {
    const { topic, schema, origin } = pulse;
    if (topic === 'kos:store') {
      try { this.model = pulse.data.access(this.tag); }
      catch (e) { this.error(e); }
      return true;
    }
    const pass = (origin === this) || this.consumes.has(schema);
    pass && debug(`${this.uri} <-- ${topic} (${schema.kind})`);
    return pass;
  }
  outgoing(pulse) {
    const { topic, schema } = pulse;
    const pass = schema.node || this.produces.has(schema);
    pass && debug(`${this.uri} --> ${topic} (${schema.kind})`);
    return pass;
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
  toJSON() {
    const { id, uri, links } = this
    return {
      id, uri, links: links.map(x => x.toJSON())
    }
  }
}

delegate(Interface.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('prefix')
  .getter('description')
  .getter('tag')
  .getter('kind')
  .method('lookup')
  .method('locate')

delegate(Interface.prototype, kModel)
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

module.exports = Interface

