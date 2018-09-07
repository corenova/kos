'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const StateMachine = require('./state')
const Dataflow = require('./dataflow')
const Reaction = require('./reaction')
const Schema   = require('./schema')

class Reactor extends StateMachine {

  get [Symbol.toStringTag]() { return `Reactor:${this.label}:${this.id}` }

  get type()  { return Symbol.for('kos:reactor') }

  get model()   { return this.prop('model') }
  set schema(x) { this.prop('schema', Schema(x)) }
  get schema()  { return this.prop('schema') }

  set state(x)  {
    if (this.model) this.model.set(x)
    else this.prop('model', this.schema.eval(x))
  }
  get state()   { return this.model ? this.model.get() : undefined }
  
  get label()   { return this.schema.prefix ? this.schema.prefix.tag : this.schema.tag }
  get purpose() { return this.schema.description ? this.schema.description.tag : undefined }
  
  get passive()  { return this.prop('passive')  }
  set passive(x) { this.prop('passive', Boolean(x)) }

  get enabled()       { return this.children.has(this.core) }
  set enabled(x=true) { x ? this.enable() : this.disable() }

  get reactions()  { return Array.from(this.children).filter(c => c instanceof Reaction) }
  set reactions(x) { x.forEach(r => new Reaction(r).join(this)) }

  get reactors()  { return Array.from(this.children).filter(c => c instanceof Reactor) }
  set reactors(x) { x.forEach(r => new Reactor(r).join(this)) }

  get contains() {
    let nodes = this.schema ? this.schema.nodes : []
    return nodes.reduce((a,node) => {
      if (node.kind == 'feature') return a
      if (node.config == false) return a
      // show/hide node.config != false?
      a.push(node.datapath)
      if (node.nodes.length)
        a.push(`${node.datapath}/*`)
      return a
    }, [])
  }
  get core() { return this.prop('core') || this.prop('core', new Dataflow) }

  constructor(spec) {
    super(spec)
    if (!this.schema) throw new Error('cannot create a new Reactor without schema')
    'enabled' in spec || this.enable()
    let Kinetic = state => this.clone(state)
    return Object.setPrototypeOf(Kinetic, this)
  }
  clone(state={}) { 
    let copy = super.clone()
    debug(`${copy} clone feed: ${Object.keys(state)}`)
    for (let k of Object.keys(state))
      copy.core.feed(k, state[k])
    return copy
  }

  // Specify whether it is passive or not
  pass(x) { this.passive = x; return this }

  // ENABLE/DISABLE this Reactor
  enable()  { return this.link(this.core) }
  disable() { return this.unlink(this.core) }

  // LOAD/UNLOAD reactors
  load(reactor, state) {
    new Reactor(reactor).save(state).join(this)
    return this
  }
  unload(reactor) {
    if (reactor instanceof Reactor) flow.leave(this)
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
  // ADAPT to changes to relationships
  adapt(change) {
    super.adapt(change)
    if (!this.parent) {
      if (change instanceof Reactor) {
        debug(`${this.identity} adapt to ${change}`)
        this.send('kos:adapt', change)
      }
    }
  }
  //--------------------------------------------------------
  // Reaction definitions and associations for this Reactor
  //--------------------------------------------------------
  get reaction() { return (new Reaction).join(this) }

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

  has(key) {
    try { return this.model.in(key) }
    catch (e) {}
    return false
  }
  get(key) {
    try { return this.model.get(key) }
    catch (e) {}
    return undefined
  }
  set(key, obj) {
    try {
      let prop = this.model.in(key)
      if (prop) prop.merge(obj)
      else throw this.error('unable to set for unknown key:', key)
    }
    catch (e) { this.error(e) }
  }
  delete(key) {
    let prop = this.model.in(key)
    prop && prop.remove()
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

