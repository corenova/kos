'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')

const StateMachine = require('./state')
const Stimulus = require('./stimulus')

class Reaction extends StateMachine {
  get [Symbol.toStringTag]() { return `Reaction:${this.label}` }
  
  static none() {}

  get type()     { return Symbol.for('kos:reaction') }
  get handler()  { return this.prop('handler') || this.prop('handler', Reaction.none) }
  set handler(fn) {
    if (typeof fn !== 'function') {
      try { fn = new Function(`return (${fn.source})`)() }
      catch (e) { throw new Error('unable to restore function from source', fn) }
      debug(`${this.identity} restored function from source`)
    }
    this.prop('handler', fn)
    this.prop('label', !!fn.name ? fn.name : 'anonymous')
    this.adapt(fn)
  }
  get source()   { return this.handler.toString() }
  get io() { return this.parent ? this.parent.io : null }

  get ready() { return this.consumes.every(this.has.bind(this)) }

  get depends()  { 
    const regex = /^module\/(.+)$/
    return this.requires.filter(x => regex.test(x)) 
  }

  filter(stimulus) {
    if (super.filter(stimulus)) {
      let input = stimulus.match(this.inputs)
      if (input && this.ready) {
        const ts = new Date
        let [ idx ] = input
        let args = this.inputs.map(k => this.get(k)).concat(this)

        // TODO: clear the local state for input triggers?
        debug(`${this.identity} ƒ(${this.inputs}) call ${stimulus.size} time(s)`)

        this.queue = new Map
        this.trigger = stimulus

        // Since stimulus may have multiple outputs generated, we collect
        // all "send" operations and "compress" them into bulk stimulus(s).
        for (let data of stimulus.values) {
          //debug(data)
          args[idx] = data
          try { this.handler.apply(this, args) }
          catch (e) { e.origin = this; debug(e); throw e; }
        }
        this.transmit()
        debug(`${this.identity} took ${new Date - ts}ms`)
      } else {
        // this stimulus was rejected/dropped
        this.mark(stimulus, false)
      }
    }
    return false // always prevent propagation of the incoming stimulus
  }

  get(...keys) {
    let res = keys.map(key => super.get(key))
    //debug(this.identity, 'get', keys, res)
    return res.length > 1 ? res : res[0]
  }

  // buffered send
  send(key, ...values) {
    if (!values.length) return this

    if (!this.queue || !this.queue.has(key)) {
      // check if key is part of allowed outputs
      if (!Stimulus.prototype.match.call({key}, this.outputs.concat('error')))
        throw new Error("["+this.identity+":send] "+key+" not in outputs: ["+this.outputs+"]")
    }

    // if no queue, then send it as we observe them
    if (!this.queue) 
      return super.send(...arguments)

    // queue this stimulus
    this.queue.has(key) || this.queue.set(key, new Stimulus(key, this))
    this.queue.get(key).add(...values)
    return this
  }

  sendImmediate(key, ...values) { return super.send(...arguments) }

  transmit() {
    for (let [ key, stimulus ] of this.queue) {
      this.push(stimulus)
      this.queue.delete(key)
      debug(`${this.identity} transmit ${key} (${stimulus.size})`)
    }
    delete this.queue
    return this
  }

  save() { return this.parent ? this.parent.save(...arguments) : super.save(...arguments) }

  find(id) {
    if (this.id === id) return this
    return this.parent ? this.parent.find(id) : null
  }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: parent
  bind(fn) { this.handler = fn; return this.parent }

  debug() { this.log('debug', ...arguments) }
  info()  { this.log('info', ...arguments) }
  warn()  { this.log('warn', ...arguments) }

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

