'use strict';

const debug = require('debug')('kos:interface');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Channel = require('./channel');

const kSchema = Symbol.for('kos:schema')
const kContains = Symbol.for('kos:contains')

class Interface extends Neural.Layer {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type() { return Symbol.for('kos:interface') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.parent ? path.join(this.parent.uri, this.datakey): this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang");
    if (!(x.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${x.kind}`);

    this[kContains] = new Set([x])
    this[kSchema] = x;
    Object.preventExtensions(this);
    x.apply(this);

    for (let i of x.import || []) {
      this[kContains].add(i.module)
    }
    // TODO: handle schema change event
  }
  
  constructor(spec={}) {
    const { id, schema, objectMode = true } = spec
    super({
      id, objectMode,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    })
    this.flows = new Map;
    this.schema = schema;
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse
    const pass = this.consumes.has(schema) || this.contains(schema)
    debug(`${this} <- ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema } = pulse
    const pass = this.produces.has(schema) || this.contains(schema)
    debug(`${this} -> ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  contains(schema) {
    const { node, root } = schema
    if (!node) return false

    if (root === this.schema) return true
    for (let i of this.schema.import || []) {
      if (i.module === root) return true
    }
    return false
  }
  connect(node) {
    
    if (!this.flows.has(node)) {
      this.flows.set(node, new Channel(node, this));
      super.connect(this.flows.get(node));
    }
    return this
  }
  disconnect(node) {
    if (this.flows.has(node)) {
      super.disconnect(this.flows.get(node));
    }
    return this
  }
  error() {
    let err = super.error(...arguments)
    this.root.emit('error', err)
    return err
  }
  inspect() {
    const { id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, layers } = this
    return {
      id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, layers
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

module.exports = Interface

