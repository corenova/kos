'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const StateMachine = require('./state')
const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Reactor extends StateMachine {

  get [Symbol.toStringTag]() { return `Reactor:${this.label}:${this.id}` }

  get type()  { return Symbol.for('kos:reactor') }

  get passive()  { return this.prop('passive')  }
  set passive(x) { this.prop('passive', Boolean(x)) }

  get enabled()       { return this.children.has(this.core) }
  set enabled(x=true) { x ? this.enable() : this.disable() }

  get reactions()  { return Array.from(this.children).filter(c => c instanceof Reaction) }
  set reactions(x) { x.forEach(r => new Reaction(r).join(this)) }

  get reactors()  { return Array.from(this.children).filter(c => c instanceof Reactor) }
  set reactors(x) { x.forEach(r => new Reactor(r).join(this)) }

  get core() { return this.prop('core') || this.prop('core', new Dataflow) }

  constructor(spec) {
    super(spec)
    'enabled' in spec || this.enable()
    let Kinetic = state => this.clone(state)
    return Object.setPrototypeOf(Kinetic, this)
  }
  create(x) {
    return typeof x === 'string' ?
      new Reactor({ label: x}) : new Reactor(x)
  }
  clone(state={}) { 
    let copy = super.clone()
    debug(`${copy} clone feed: ${Object.keys(state)}`)
    for (let k of Object.keys(state))
      copy.core.feed(k, state[k])
    return copy
  }

  // Describe purpose of Reactor and specify whether it is passive or not
  desc(x) { this.purpose = x; return this }
  pass(x) { this.passive = x; return this }

  // ENABLE/DISABLE this Reactor
  enable()  { return this.link(this.core) }
  disable() { return this.unlink(this.core) }

  // LOAD/UNLOAD reactors
  load(flow, state) {
    this.create(flow).save(state).join(this)
    return this
  }
  unload(flow) {
    if (flow instanceof Reactor) flow.leave(this)
    return this
  }
  // LINK/UNLINK dataflows
  link(flow) {
    if (flow === this.core) return super.link(flow)
    if (this.children.has(flow)) return this

    this.core.link(flow)
    this.children.add(flow)
    this.adapt(flow)
    return this
  }
  unlink(flow) {
    if (flow === this.core) return super.unlink(flow)
    if (!this.children.has(flow)) return this

    this.core.unlink(flow)
    this.children.delete(flow)
    this.adapt(flow)
    return this
  }

  // ADAPTive behavior
  adapt(change) {
    super.adapt(change)
    if (!this.parent) {
      if (change instanceof Reactor) {
        debug(`${this.identity} adapt to ${change}`)
        this.send('adapt', change)
      }
    }
  }
  
  //--------------------------------------------------------
  // Reaction definitions and associations for this Reactor
  //--------------------------------------------------------
  get reaction() { return (new Reaction).join(this) }
  pre(...keys) { return new Reaction({ requires: keys }).join(this) }
  in(...keys)  { return new Reaction({ inputs: keys }).join(this) }

  filter(pulse) {
    if (this.core.seen(pulse)) {
      if (pulse.match(this.provides)) {
        debug(`${this.identity} --> ${pulse.topic} (origin: ${pulse.origin})`)
        return true
      }
    } else {
      if (pulse.match(this.accepts)) {
        debug(`${this.identity} <-- ${pulse.topic}`)
        this.mark(pulse, true)
        // if (pulse.match(this.contains)) {
          
        // }
        return true
      }
    }
    return false
  }

  find(id) {
    if (!id) return null
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const flow of this.reactors) {
      match = flow.find(id)
      if (match) return match
    }
    return null
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

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
    cache.provides = uniqueKeys(provides)
    cache.accepts  = uniqueKeys(accepts)
    return this.prop('cache', cache)
  }

  inspect() {
    const { 
      passive, enabled, depends, accepts, provides, reactions, reactors
    } = this
    return Object.assign(super.inspect(), {
      passive, enabled, depends, accepts, provides, reactions, reactors
    })
  }

  toJSON() {
    const { passive, reactions, reactors } = this
    return Object.assign(super.toJSON(), {
      passive, 
      reactions: reactions.map(r => r.toJSON()),
      reactors:  reactors.map(r => r.toJSON())
    })
  }
}

delegate(Reactor.prototype, 'cache')
  .getter('absorbs')
  .getter('depends')
  .getter('provides')
  .getter('accepts')

function extractUniqueKeys(flows=[], ...names) {
  let keys = flows.reduce((a, flow) => {
    return a.concat(...names.map(x => flow[x]))
  }, []).filter(Boolean)
  return uniqueKeys(keys)
}

function uniqueKeys(keys) {
  return Array.from(new Set(keys))
}

module.exports = Reactor

