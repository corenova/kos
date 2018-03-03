'use strict';

const debug    = require('debug')('kos:reactor')
const delegate = require('delegates')

const StateMachine = require('./state')
const Dataflow = require('./dataflow')
const Reaction = require('./reaction')

class Neuron extends StateMachine {

  get [Symbol.toStringTag]() { return `Reactor:${this.label}:${this.id}` }

  get type()  { return Symbol.for('kos:reactor') }

  get enabled()  { return this.children.has(this.core) }
  set enabled(x) { x ? this.enable() : this.disable() }

  get reactions()  { return Array.from(this.children).filter(c => c instanceof Reaction) }
  set reactions(x) { x.forEach(r => new Reaction(r).join(this)) }

  get reactors()  { return Array.from(this.children).filter(c => c instanceof Reactor) }
  set reactors(x) { x.forEach(r => new Reactor(r).join(this)) }

  get core() { return this.prop('core') || this.prop('core', new Dataflow) }

  constructor(schema) {
    super(schema)
    this.schema = schema
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

  filter(token) {
    if (this.core.seen(token)) {
      if (token.match(this.provides)) {
        debug(`${this.identity} --> ${token.topic} (${token.origin})`)
        return true
      }
    } else {
      if (token.match(this.accepts)) {
        debug(`${this.identity} <-- ${token.topic}`)
        this.mark(token, true)
        return true
      }
    }
    return false
  }

  find(id) {
    if (this.id === id) return this
    let match = this.reactions.find(x => x.id === id)
    if (match) return match
    for (const flow of this.reactors) {
      match = flow.find(id)
      if (match) return match
    }
    return null
  }
}

delegate(Reactor.prototype, 'cache')
  .getter('absorbs')
  .getter('depends')
  .getter('provides')
  .getter('accepts')

delegate(Reactor.prototype, 'schema')
  .getter('absorbs')
  .getter('depends')
  .getter('provides')
  .getter('accepts')
  .getter('inspect')
  .getter('toJSON')

module.exports = Reactor

