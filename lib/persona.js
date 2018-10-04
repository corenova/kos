'use strict';

const debug = require('debug')('kos:persona');
const delegate = require('delegates');
const path = require('path');
const Yang = require('yang-js');

const Interface = require('./interface');
const Generator = require('./generator');
const Reaction  = require('./reaction');

const kModel = Symbol.for('kos:model')
const kSchema = Symbol.for('kos:schema')

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }

  get reactions()  { return this.nodes.filter(n => n instanceof Reaction) }
  get generators() { return this.links.filter(n => n instanceof Generator) }
  
  get state()  { return this[kModel].get() }
  set state(x) { this[kModel].set(x) }
  
  constructor(schema, config) {
    super(schema)
    this.model = schema(config)
  }
  add(node) {
    if (super.add(node)) {
      // should connect generators in a special way...
      if (node instanceof Generator) {
        for (let n of this.generators) n.link(node)
      }
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Generator) {
        for (let n of this.generators) n.unlink(node)
      }
      return true
    }
    return false
  }
  use(uri) {
    let schema = this.locate(uri)
    return this.generators.find(x => x.schema === schema)
  }
  feed(topic, ...values) {
    this.write(this.create(topic, ...values))
    return this
  }
  save(state, emit=false) {
    this[kModel].merge(state, { suppress: !emit })
    return this
  }
  absorb(pulse, opts={}) {
    const { topic, schema, data } = pulse
    const { force=true, suppress=true } = opts
    if (this.model && schema.node) {
      const match = this.in(topic)
      if (!match) return
      
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
          else prop.merge(data, { force, suppress })
        }
      }
    }
  }
  incoming(pulse) {
    const { topic, schema } = pulse
    this.absorb(pulse)
    if (this.generators.some(n => n.consumes.has(schema))) {
      debug(`${this} <-- ${topic} (${schema.datakey}) [ACCEPT by generator]`)
      return true
    } else return super.incoming(pulse)
  }
  outgoing(pulse) {
    this.absorb(pulse, { suppress: false })
    return super.outgoing(pulse)
  }
  toJSON() {
    const { id, uri, layers } = this
    return {
      id, uri, layers: layers.map(x => x.toJSON())
    }
  }
}

module.exports = Persona

