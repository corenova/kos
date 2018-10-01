'use strict';

const debug = require('debug')('kos:persona');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');

const Component = require('./component');
const Reaction  = require('./reaction');

const kModel = Symbol.for('kos:model')
const kSchema = Symbol.for('kos:schema')

class Persona extends Neural.Network {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get components() { return this.layers.filter(n => n instanceof Component) }
  get reactions()  { return this.nodes.filter(n => n instanceof Reaction) }
  
  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Persona schema must be an instance of Yang");
    if (!(x.kind === 'module'))
      throw this.error(`Persona schema must be a Yang module, not ${x.kind}`);

    this[kModel] = undefined
    this[kSchema] = x;
    Object.preventExtensions(this);
    x.apply(this);

    for (let i of x.import || []) {
      new Persona(i.module).join(this);
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
      this.outflow.write(pulse)
    }
    if (this[kModel] != model) {
      this[kModel] && this[kModel].removeListener('update', propagate)
      model.on('update', propagate)
      this[kModel] = model
      try {
        const pulse = new Pulse('kos:model', this).add(model)
        this.inflow.push(pulse)
      } catch (e) { }
    }
  }
  get state()  { return this[kModel].get() }
  set state(x) { this[kModel].set(x) }
  
  constructor(schema, config) {
    super({
      objectMode: true,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    })
    this.schema = schema;
    if (config) this.model = schema(config)
  }
  use(component) {
    let schema = this.locate(component)
    return this.components.find(c => c.schema === schema)
  }
  make(component, state) {
    let match = this.use(component)
    if (!match)
      throw this.error(`unable to make a new component: ${component}`)
    return match.clone(state)
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values))
    return this
  }
  save(state, emit=false) {
    this[kModel].merge(state, { suppress: !emit })
    return this
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse
    if (this === this.root && this.model && schema.node) {
      const match = this.in(topic)
      if (match) {
        debug(`${this} <<< ${topic}`)
        const props = [].concat(match)
        for (let prop of props) {
          switch (prop.kind) {
          case 'action':
          case 'rpc':
            prop.do(data)
              .catch(this.error.bind(prop))
            break;
          default:
            if (data === null) prop.remove()
            else prop.merge(data, { force: true, suppress: true })
          }
        }
      }
    }
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
    const { id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, layers } = this
    return {
      id, type, name, uri, summary, inputs, hiddens, outputs, orphans, nodes, layers
    }
  }
  toJSON() {
    const { id, uri, layers } = this
    return {
      id, uri, layers: layers.map(x => x.toJSON())
    }
  }
}

delegate(Persona.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('prefix')
  .getter('description')
  .getter('tag')
  .getter('kind')
  .method('lookup')
  .method('locate')

delegate(Persona.prototype, kModel)
  .method('in')
  .method('get')
  .method('merge')

module.exports = Persona

