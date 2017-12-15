'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')
const Stimulus = require('./stimulus')

const proto = module.exports = {
  get(...keys) {
    let res = keys.map(key => this.reaction.get(key))
    return res.length > 1 ? res : res[0]
  },

  use(key, value) {
    if (this.has(key)) return this.get(key)
    this.set(key, value)
    return value
  },

  feed(key, ...values) {
    this.exec(new Stimulus(key).add(...values))
    return this
  },

  send(key, ...values) {
    // if already flushed, then send it as we observe them
    if (this.queue.flushed === true) 
      return this.push(new Stimulus(key, this).add(...values))
    // check if key is part of allowed outputs
    if (!Stimulus.prototype.match.call({key}, this.outputs))
      throw new Error("["+this.identity+":send] "+key+" not in outputs: ["+this.outputs+"]")
    // preserve the send queue inside this context
    debug(this.identity, 'queue', key)
    // preserve an instance of the stimulus inside state machine
    this.queue.has(key) || this.queue.set(key, new Stimulus(key, this))
    this.queue.get(key).add(...values)
  },

  flush() {
    for (let [ key, stimulus ] of this.queue) {
      debug(this.identity, `flushing ${key} (${stimulus.length})`)
      this.push(stimulus.compress())
      this.queue.delete(key)
    }
    this.queue.flushed = true
  },

  log(type, ...args) { 
    this.reactor.log(new Stimulus(type, this).add(...args))
  },
  debug() { this.log('debug', ...arguments) },
  info()  { this.log('info', ...arguments) },
  warn()  { this.log('warn', ...arguments) },
  error() {
    let e = new Error([...arguments].join(' '))
    e.origin = this.reaction
    this.push(new Stimulus('error', this).add(e))
    return e
  },

  // throw error
  throw() { throw this.error(...arguments) }
}

// Reaction instance
delegate(proto, 'reaction')
  .getter('id')
  .getter('identity')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('reactor')
  .method('exec')
  .method('push')
  // expose state methods within context
  .method('has')
  .method('set')
  .method('delete')
  .method('clear')

// Reactor instance
delegate(proto, 'reactor')
  .getter('parent')
  .method('contains')
  .method('find')
  .method('save')
  .method('io')

// Persona instance
delegate(proto, 'parent')
  .method('clone')
  .method('load')
  .method('unload')
  .method('join')
  .method('leave')
