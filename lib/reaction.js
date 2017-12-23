'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')

const StateMachine = require('./state')
const Stimulus = require('./stimulus')

class Reaction extends StateMachine {
  get [Symbol.toStringTag]() { return `Reaction:${this.label}` }
  
  static none() {}

  filter(stimulus) {
    if (super.filter(stimulus)) {
      let input = stimulus.match(this.inputs)
      if (input && this.ready) {
        let [ idx ] = input
        let args = this.inputs.map(k => this.get(k))

        // TODO: clear the local state for input triggers?
        debug(this.identity, 'ƒ(' + this.inputs + ')', 'call', stimulus.length, 'time(s)')

        // Since stimulus may have multiple outputs generated, we collect
        // all "send" operations and "compress" them into bulk stimulus(s).
        this.trigger = stimulus
        for (let data of stimulus) {
          //debug(data)
          args[idx] = data
          try { this.handler.apply(this, args.concat(this)) }
          catch (e) { e.origin = this; debug(e); throw e; }
        }
        this.transmit()
      } else {
        // this stimulus was rejected/dropped
        this.mark(stimulus, false)
      }
    }
    return false // always prevent propagation of the incoming stimulus
  }

  get ready() { return this.consumes.every(this.has.bind(this)) }
  get queue() { return this.prop('queue') || this.prop('queue', new Map) }

  get(...keys) {
    let res = keys.map(key => super.get(key))
    //debug(this.identity, 'get', keys, res)
    return res.length > 1 ? res : res[0]
  }

  // buffered send
  send(key, ...values) {
    // if already flushed, then send it as we observe them
    if (this.queue.flushed === true) 
      return super.send(...arguments)

    // check if key is part of allowed outputs
    if (!Stimulus.prototype.match.call({key}, this.outputs.concat('error')))
      throw new Error("["+this.identity+":send] "+key+" not in outputs: ["+this.outputs+"]")
    // preserve the send queue inside this context
    debug(this.identity, 'queue', key)
    // preserve an instance of the stimulus inside state machine
    this.queue.has(key) || this.queue.set(key, new Stimulus(key, this.state))
    this.queue.get(key).add(...values)
    return this
  }

  sendImmediate(key, ...values) { return super.send(...arguments) }

  transmit() {
    for (let [ key, stimulus ] of this.queue) {
      debug(this.identity, `flushing ${key} (${stimulus.length})`)
      this.push(stimulus.compress())
      this.queue.delete(key)
    }
    this.queue.flushed = true
    return this
  }

  save() { return this.parent ? this.parent.save(...arguments) : super.save(...arguments) }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: parent
  bind(fn) { this.handler = fn; return this.parent }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }
  warn()  { this.log('warn', ...arguments) }

  //----------------------------------------------
  // Collection of Getters for inspecting Reaction
  //----------------------------------------------

  get type()     { return Symbol.for('kos:reaction') }
  get handler()  { return this.prop('handler') || this.prop('handler', Reaction.none) }
  set handler(fn) {
    if (typeof fn !== 'function') {
      try { fn = new Function(`return (${fn.source})`)() }
      catch (e) { throw new Error('unable to restore function from source', fn) }
      debug(this.identity, 'restored function from source')
    }
    this.prop('handler', fn)
    this.prop('label', !!fn.name ? fn.name : 'anonymous')
    this.adapt(fn)
  }
  get source()   { return this.handler.toString() }

  get depends()  { 
    const regex = /^module\/(.+)$/
    return this.requires.filter(x => regex.test(x)) 
  }

  inspect() {
    const { depends, handler } = this
    return Object.assign(super.inspect(), { depends, handler })
  }

  toJSON() {
    const { label, source } = this
    return Object.assign(super.toJSON(), {
      handler: { label, source }
    })
  }
}

// Reactor instance
// delegate(Reaction.proto, 'parent')
//   .getter('io')
//   .method('save')
//   .method('contains')
//   .method('find')
//   .method('load')
//   .method('unload')

module.exports = Reaction

