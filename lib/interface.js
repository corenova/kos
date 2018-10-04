'use strict';

const debug = require('debug')('kos:interface');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');

const kModel = Symbol.for('kos:model')
const kSchema = Symbol.for('kos:schema')

class Interface extends Neural.Layer {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type() { return Symbol.for('kos:interface') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang");
    if (!(x.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${x.kind}`);

    this[kModel] = undefined
    this[kSchema] = x;
    Object.preventExtensions(this);
    x.apply(this);

    for (let i of x.import || []) {
      new Interface(i.module).join(this);
    }
    // TODO: handle schema change event
  }
  get model() { return this[kModel] }
  set model(m) {
    let model
    try { model = m.name === this.tag ? m : m.access(this.tag) }
    catch (e) { debug(e.message) }
    if (!model) return

    const propagate = (prop) => {
      let { path, content } = prop
      //if (prop === this.model) return
      debug(`${this} feed on update to ${path}`)
      const pulse = new Pulse(`${path}`, this).add(content)
      this.inflow.write(pulse)
      this.outflow.push(pulse) // we push here to bypass "outgoing" filter
    }
    if (this[kModel] != model) {
      this[kModel] && this[kModel].off('update', propagate)
      model.on('update', propagate)
      this[kModel] = model
      try {
        const pulse = new Pulse('kos:model', this).add(model)
        this.inflow.push(pulse)
      } catch (e) { }
    }
  }
  
  constructor(schema) {
    super({
      objectMode: true,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    })
    this.schema = schema;
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values))
    return this
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse
    if (topic === 'kos:model') {
      this.model = data
    }
    const pass = this.consumes.has(schema)
    debug(`${this} <-- ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema } = pulse
    const pass = schema.node || this.produces.has(schema)
    debug(`${this} --> ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  inspect() {
    const { id, type, name, uri, summary, consumes, produces, inputs, hiddens, outputs, orphans, nodes, links } = this
    return {
      id, type, name, uri, summary,
      consumes: Array.from(consumes).map(x => x.datapath),
      produces: Array.from(produces).map(x => x.datapath),
      inputs, hiddens, outputs, orphans, nodes, links
    }
  }
  toJSON() {
    const { id, uri, layers } = this
    return {
      id, uri, layers: layers.map(x => x.toJSON())
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
  .method('merge')

module.exports = Interface

