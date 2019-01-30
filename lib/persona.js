'use strict';

const debug = require('./debug').extend('persona');
const delegate = require('delegates');
const Yang = require('yang-js');

const Neural = require('./neural'); // should remove...
const Node = require('./node');
const Filter = require('./filter');
const Pulse = require('./pulse');

const kProp = Symbol.for('property'); // hack to tie into Yang model
const kCore = Symbol.for('kos:core');
const kSchema = Symbol.for('kos:schema');
const kModel = Symbol.for('kos:model');

class Persona extends Node {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type()  { return Symbol.for('kos:persona') }

  get core() { return this[kCore] }
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
    super(schema);
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
    
    this.state = state
    this.core.pipe(this)
    this.active = false // disabled by default
  }
  feed(topic, ...values) {
    let pulse = this.make(topic, ...values);
    for (let node of this.core.nodes) {
      node.consumes.has(pulse.schema) && node.write(pulse)
    }
    return this
  }
  //
  // Persona Processing
  //
  activate(pulse, done) {
    if (super.activate(pulse)) {
      this.active && this.core.write(pulse);
      done()
    } else {
      done(null, pulse); // do we need this?
    }
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
      this[kProp].parent = ctx.property;
    }
    // this[kProp].container = obj
    // Object.defineProperty(obj, this.name, this[kProp])
    return super.join(obj, ctx);
  }
  inspect() {
    return Object.assign(super.inspect(), {
      core: this.core.inspect()
    });
  }
}

delegate(Persona.prototype, kModel)
  .method('in')
  .method('get')
  .method('merge')

module.exports = Persona
