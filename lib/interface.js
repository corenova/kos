'use strict';

const debug = require('debug')('kos:interface');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const { Network, Neuron, kSource } = require('./neural');
const Reaction = require('./reaction');
const kSchema = Symbol.for('kos:interface:schema')
const kScope  = Symbol.for('kos:interface:scope')

class Interface extends Network {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type()    { return Symbol.for('kos:interface') }
  get label()   { return this.prefix ? this.prefix.tag : this.tag }
  get uri()     { return this.source ? path.join(this.source.uri, this.datakey): this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }
  get actors()  { return this.nodes.filter(x => x instanceof Reaction) }
  get routes()  { return this.links.filter(x => x instanceof Interface) }
  
  get schema() { return this[kSchema] }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x);
    if (!(x instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang");
    if (!(x.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${x.kind}`);

    this[kScope] = undefined;
    this[kSchema] = x;
    Object.preventExtensions(this);
    x.apply(this);

    for (let i of x.import || []) {
      new Interface(i.module).join(this);
    }
    // TODO: handle schema change
  }

  set scope(x) { this[kScope] = x }
  get scope() {
    if (!this[kScope]) {
      let consumes = this.actors.map(r => Array.from(r.consumes))
      let produces = this.actors.map(r => Array.from(r.produces))
      this[kScope] = {
        consumes: new Set([].concat(...consumes)),
        produces: new Set([].concat(...produces))
      }
    }
    return this[kScope];
  }
  
  constructor(schema) {
    super();
    this.schema = schema;
  }
  incoming(pulse) {
    const { topic, schema } = pulse
    const pass = this.consumes.has(schema)
    debug(`${this} <- ${topic} (${schema.tag}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema } = pulse
    const pass = this.produces.has(schema)
    debug(`${this} -> ${topic} (${schema.tag}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  inspect() {
    const { label, uri, summary, actors, routes } = this
    const { id, type, inputs, hiddens, outputs, orphans } = super.inspect()
    return {
      id, type, label, uri, summary, inputs, hiddens, outputs, orphans, actors, routes
    }
  }
}

delegate(Interface.prototype, 'schema')
  .getter('datapath')
  .getter('datakey')
  .getter('prefix')
  .getter('description')
  .getter('tag')
  .getter('kind')
  .method('lookup')
  .method('locate')

delegate(Interface.prototype, 'scope')
  .getter('consumes')
  .getter('produces')

module.exports = Interface

