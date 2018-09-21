'use strict';

const debug = require('debug')('kos:interface');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Neural = require('./neural');
const Channel = require('./channel')
const Pulse = require('./pulse');

const kModel = Symbol.for('kos:interface:model')
const kSchema = Symbol.for('kos:interface:schema')
const kState = Symbol.for('kos:interface:state')

class Interface extends Neural.Network {

  get [Symbol.toStringTag]() { return `Interface:${this.uri}` }
  get type() { return Symbol.for('kos:interface') }
  get name() { return this.prefix ? this.prefix.tag : this.tag }
  get uri()  { return this.source ? path.join(this.source.uri, this.datakey): this.datakey }
  get summary() { return this.description ? this.description.tag : undefined }

  get schema() { return this[kSchema] }
  set schema(x) {
    if (!(x instanceof Yang))
      throw this.error("Interface schema must be an instance of Yang");
    if (!(x.kind === 'module'))
      throw this.error(`Interface schema must be a Yang module, not ${x.kind}`);

    this[kModel] = undefined
    this[kState] = new Map
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
      this.outflow.write(pulse)
    }
    if (this[kModel] != model) {
      // TODO: need to remove the 'update' listener on previous this[kModel]
      this[kModel] && this[kModel].removeListener('update', propagate)
      model.on('update', propagate)
      this[kModel] = model
      try {
        const pulse = new Pulse('kos:model', this).add(model)
        this.inflow.push(pulse)
      } catch (e) { }
    }
  }
  get state() {
    let obj = Object.create(null)
    for (let [k,v] of this[kState]) obj[k] = v
    return obj
  }
  set state(x) { this.save(x) }
  
  constructor(schema) {
    super({
      objectMode: true,
      inflow:  new Channel({ filter: x => this.incoming(x) }),
      outflow: new Channel({ filter: x => this.outgoing(x) })
    })
    this.schema = schema;
  }
  feed(topic, ...values) {
    this.write(new Pulse(topic, this).add(...values))
    return this
  }
  save(state, emit=true) {
    if (typeof state === "object") {
      const keys = Object.keys(state)
      let diff = false
      for (let k of keys) {
        if (this.has(k) && 
            this.get(k) === state[k]) {
          continue
        }
        diff = true
        this.set(k, state[k])
      }
      if (emit) this.emit("save", state)
    }
    return this
  }
  incoming(pulse) {
    const { topic, schema, data } = pulse
    if (topic === 'kos:model') {
      this.model = data
    }
    const pass = this.consumes.has(schema)
    debug(`${this} <- ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema } = pulse
    const pass = this.produces.has(schema) || topic === 'kos:error'
    debug(`${this} -> ${topic} (${schema.datakey}) [${pass ? 'ACCEPT' : 'DENY'}]`)
    return pass
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

delegate(Interface.prototype, kModel)
  .method('in')

delegate(Interface.prototype, kState)
  .method('has')
  .method('get')
  .method('set')
  .method('clear')

module.exports = Interface

