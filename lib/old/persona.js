'use strict';

const debug = require('debug')('kos:persona')

const Synthetic = require('./synthetic')
const Reaction = require('./reaction')

class Persona extends Synthetic {
  get [Symbol.toStringTag]() { return `Persona:${this.label}` }

  get type()  { return Symbol.for('kos:persona') }

  get purpose()  { return this.get('purpose') }
  set purpose(x) { this.set('purpose', x) }

  get passive()  { return this.has('passive') ? this.get('passive') : false }
  set passive(x) { this.set('passive', Boolean(x)) }

  constructor(schema) {
    

  }

  // Describe purpose of Persona and specify whether it is passive or not
  desc(x) { this.purpose = x; return this }
  pass(x) { this.passive = x; return this }

  //--------------------------------------------------------
  // Reaction definitions for this Persona
  //--------------------------------------------------------
  pre(...keys) { return new Reaction({ requires: keys }).join(this) }
  in(...keys)  { return new Reaction({ inputs: keys }).join(this) }
  out(...keys) { return new Reaction({ outputs: keys }).join(this) }

  get cache() {
    if (this.prop('cache')) return this.prop('cache')

    const { reactions, reactors } = this
    this.requires = extractUniqueKeys(reactions, 'requires')
    this.inputs   = extractUniqueKeys(reactions, 'inputs')
    this.outputs  = extractUniqueKeys(reactions, 'outputs')

    const cache = super.cache
    const { consumes, outputs } = cache
    const absorbs  = extractUniqueKeys(reactors, 'accepts')
    const depends  = extractUniqueKeys(reactions.concat(reactors), 'depends')
    const provides = outputs.concat('error')
    const accepts  = depends.concat(consumes)
    if (this.passive) accepts.push(...absorbs)

    cache.absorbs  = absorbs
    cache.depends  = depends
    cache.provides = provides
    cache.accepts  = accepts
    return this.prop('cache', cache)
  }

  inspect() {
    const { 
      purpose, passive, enabled, depends, accepts, provides, reactions, reactors
    } = this
    return Object.assign(super.inspect(), {
      purpose, passive, enabled, depends, accepts, provides, reactions, reactors
    })
  }

  toJSON() {
    const { purpose, passive, enabled, reactions, reactors } = this
    return Object.assign(super.toJSON(), {
      purpose, passive, enabled,
      reactions: reactions.map(r => r.toJSON()),
      reactors:  reactors.map(r => r.toJSON())
    })
  }
}

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, []).filter(Boolean)
  return uniqueKeys(keys)
}

function uniqueKeys(keys) {
  return Array.from(new Set(keys))
}

module.exports = Persona
