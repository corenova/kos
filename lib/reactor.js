'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const StateMachine = require('./state')
const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Reactor extends StateMachine {

  get [Symbol.toStringTag]() { return `Reactor:${this.label}:${this.id}` }

  constructor(props) {
    super(props)
    if (typeof props.enabled === 'undefined')
      this.enabled = true
  }

  create(x) { return typeof x === 'string' ? new Reactor({ label: x }) : new Reactor(x) }

  // Describe purpose of Reactor and specify whether it is passive or not
  desc(x) { this.purpose = x; return this }
  pass(x) { this.passive = x; return this }

  get purpose()  { return this.prop('purpose') }
  set purpose(x) { this.prop('purpose', x) }

  get passive()  { return this.prop('passive') }
  set passive(x) { this.prop('passive', Boolean(x)) }

  // ENABLE/DISABLE this Reactor
  enable()  { debug(`${this} enable core`); return this.link(this.core) }
  disable() { debug(`${this} disable core`); return this.unlink(this.core) }

  get enabled()  { return this.children.has(this.core) }
  set enabled(x) { x ? this.enable() : this.disable() }

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

  get reactions()  { return Array.from(this.children).filter(c => c instanceof Reaction) }
  set reactions(x) { x.forEach(r => new Reaction(r).join(this)) }

  get reactors()  { return Array.from(this.children).filter(c => c instanceof Reactor) }
  set reactors(x) { x.forEach(r => new Reactor(r).join(this)) }

  get children() { return super.children }
  set children(x=[]) {
    for (let child of x) {
      if (child.type === Symbol.for('kos:reaction')) {
        child = new Reaction(child)
      } else if (child.type === Symbol.for('kos:reactor')) {
        child = new Reactor(child)
      }
      child.join(this)
    }
  }

  get core() {
    return this.prop('core') || this.prop('core', new StateMachine({
      label: 'core',
      filter: stimulus => {
        const { topic } = stimulus
        if (stimulus.match(this.consumes)) {
          debug(this.identity, '<==', topic)
          // update the stimulus that it's been consumed by this reactor
          this.mark(stimulus, true)
          return true
          // // execute the reactions
          // for (let reaction of this.reactions) {
          //   try { reaction(stimulus) }
          //   catch (e) { this.error(e) }
          // }
        }

        // always passthrough errors 
        if (topic === 'error') return true

        if (stimulus.match(this.outputs)) {
          debug(this.identity, '==>', topic)
          return true
        }

        if (stimulus.match(this.absorbs)) {
          debug(this.identity, '<->', topic)
          return true
        }

        if (this.enabled && stimulus.match(this.depends)) {
          debug(this.identity, '<--', topic)
          return true
        }
        
        return false
      }
    }))
  }

  //--------------------------------------------------------
  // Reaction definitions and associations for this Reactor
  //--------------------------------------------------------
  pre(...keys) { return new Reaction({ requires: keys }).join(this) }
  in(...keys)  { return new Reaction({ inputs: keys }).join(this) }

  filter(stimulus) {
    if (this.core.seen(stimulus)) {
      return stimulus.match(this.provides)
    } else {
      return stimulus.match(this.accepts)
    }
  }

  save(state, opts={}) {
    const { feed = false } = opts
    super.save(...arguments)
    if (feed && state) {
      debug(this.identity, `save feed: ${Object.keys(state)}`)
      for (let k of Object.keys(state))
        this.core.feed(k, state[k])
    }
    return this
  }

  //----------------------------------------------
  // Collection of Getters for inspecting Reactor
  //----------------------------------------------

  get type()  { return Symbol.for('kos:reactor') }

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
      purpose, passive, enabled, depends, accepts, provides
    } = this
    return Object.assign(super.inspect(), {
      purpose, passive, enabled, depends, accepts, provides,
      reactions: this.reactions.map(x => x.inspect()),
      reactors:  this.reactors.map(x => x.inspect())
    })
  }

  toJSON() {
    const { purpose, passive, enabled } = this
    return Object.assign(super.toJSON(), {
      purpose, passive, enabled
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

