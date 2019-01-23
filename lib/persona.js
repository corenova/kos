'use strict';

const debug = require('./debug').extend('persona');
const delegate = require('delegates');
const Yang = require('yang-js');

const Neural = require('./neural');
const Filter = require('./filter');
const Pulse = require('./pulse');

const kProp = Symbol.for('property'); // hack to tie into Yang model
const kCore = Symbol.for('kos:core');
const kSchema = Symbol.for('kos:schema');
const kModel = Symbol.for('kos:model');

class Persona extends Neural.Node {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type()  { return Symbol.for('kos:persona') }
  get name()  { return this.datakey }
  get uri()   { return this.datapath }
  get summary() { return this.description ? this.description.tag : undefined }

  get core() { return this[kCore] }
  get schema() { return this[kSchema] }
  set schema(x) { 
    if (typeof x === 'string') x = Yang.parse(x)
    if (!(x instanceof Yang))
      throw new Error("Persona schema must be an instance of Yang")

    this[kSchema] = x
    this[kProp] = new Yang.Property(x.datakey).set(this)
    x.apply(this, this[kProp].context) // apply schema to this
    // below is a bit hackish...
    const desc = Object.getOwnPropertyDescriptor(this,'state')
    this[kModel] = desc.get.bound
    
    // TODO: handle schema change
  }
  
  constructor(schema, state) {
    super({ objectMode: true })
    this[kCore] = new Neural.Layer({
      objectMode: true, parent: this,
      inflow:  new Filter({ filter: x => this.incoming(x) }),
      outflow: new Filter({ filter: x => this.outgoing(x) })
    })
    delegate(this[kCore], 'parent')
      .access('state')
      .method('feed')
      .method('in')
      .method('get')
      .method('merge')
    
    this.schema = schema
    this.state = state
    this.core.pipe(this)
    this.active = false // disabled by default
  }
  feed(topic, ...values) {
    let pulse = new Pulse(topic, this).add(...values)
    for (let node of this.core.nodes) {
      node.consumes.has(pulse.schema) && node.write(pulse)
    }
    return this
  }
  //
  // Persona Processing
  //
  activate(pulse, done) {
    if (!(pulse instanceof Pulse))
      return done(this.error('Persona can only process Pulse objects'))

    if (pulse.tagged(this)) {
      done(null, pulse);
    } else {
      this.active && this.core.write(pulse);
      done()
    }
    return null
  }
  incoming(pulse) {
    const { topic, schema } = pulse
    const pass = this.consumes.has(schema)
    pass && debug(`${this.uri} <-- ${topic} (${schema.kind})`)
    pulse.tag(this)
    return pass
  }
  outgoing(pulse) {
    const { topic, schema, data } = pulse
    const pass = this.produces.has(schema)
    pass && debug(`${this.uri} --> ${topic} (${schema.kind})`)
    pulse.tag(this)
    return pass
  }
  join(obj, ctx={}) {
    if (ctx.property instanceof Yang.Property) {
      this[kProp].parent = ctx.property
    }
    if (obj instanceof Neural.Layer) {
      return super.join(obj);
    }
    // this[kProp].container = obj
    // Object.defineProperty(obj, this.name, this[kProp])
    return obj
  }
  inspect() {
    const { name, uri, summary, consumes, produces, core } = this
    return Object.assign(super.inspect(), {
      name, uri, summary,
      consumes: Array.from(consumes.keys()).map(x => x.datapath),
      produces: Array.from(produces.keys()).map(x => x.datapath),
      core: core.inspect()
    })
  }
}

delegate(Persona.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .getter('binding')
  .method('bind')
  .method('locate')
  .method('lookup')

delegate(Persona.prototype, kModel)
  .method('in')
  .method('get')
  .method('merge')

module.exports = Persona
