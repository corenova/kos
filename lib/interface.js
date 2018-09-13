'use strict';

const debug = require('debug')('kos:interface');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Neural = require('./neural');
const Dataflow = require('./dataflow')

const kCore = Symbol.for('kos:interface:core')
const kModel = Symbol.for('kos:interface:model')
const kSchema = Symbol.for('kos:interface:schema')
const kConsumes = Symbol.for('kos:interface:consumes')
const kProduces = Symbol.for('kos:interface:produces')

class Interface extends Neural.Network {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type() { return Symbol.for('kos:interface') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.source ? path.join(this.source.uri, this.datakey): this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get model() { return this[kModel] }
  get consumes() { return this[kConsumes] }
  get produces() { return this[kProduces] }
  set consumes(x) { this[kConsumes] = new Set([].concat(x)) }
  set produces(x) { this[kProduces] = new Set([].concat(x)) }

  constructor(schema, model) {
    super({
      objectMode: true,
      inflow:  new Dataflow({ filter: x => this.incoming(x) }),
      outflow: new Dataflow({ filter: x => this.outgoing(x) })
    })

    if (!(schema instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang");
    if (!(schema.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${schema.kind}`);
    
    this[kSchema] = schema;
    this[kModel] = model instanceof Yang.Model ? model : schema(model)
    this[kConsumes] = undefined;
    this[kProduces] = undefined;
    Object.preventExtensions(this);
    schema.apply(this);

    let consumes = this.nodes.map(n => Array.from(n.consumes))
    let produces = this.nodes.map(n => Array.from(n.produces))
    this.consumes = [].concat(...consumes)
    this.produces = [].concat(...produces)
    
    for (let i of schema.import || []) {
      new Interface(i.module, this[kModel]).join(this);
    }
    // TODO: handle schema change
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
    const { id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, links } = this
    return {
      id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, links
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

module.exports = Interface

