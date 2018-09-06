'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')

const StateMachine = require('./state')
const Pulse = require('./pulse')

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
    this.adapt(fn)
  }
  get label()  { return !!this.handler.name ? this.handler.name : 'anonymous' }
  get source() { return this.handler.toString() }
  get io() { return this.parent ? this.parent.io : null }

  get ready() { return this.consumes.every(this.has.bind(this)) }

  get depends()  { 
    const regex = /^module\/(.+)$/
    return this.requires.filter(x => regex.test(x)) 
  }

  fill(target, keys) {
    target = this.prop(target)
    if (!target) return this
    for (let key of keys)
      typeof key === 'string' && target.add(key)
    this.adapt(target)
    return this
  }

  pre(...keys) { return this.fill('requires', keys) }
  in(...keys)  { return this.fill('inputs', keys) }
  out(...keys) { return this.fill('outputs', keys) }
  
  filter(pulse) {
    if (super.filter(pulse)) {
      let input = pulse.match(this.inputs)
      if (input && this.ready) {
        const ts = new Date
        let [ idx ] = input
        let args = this.inputs.map(k => this.get(k)).concat(this)

        // TODO: clear the local state for input triggers?
        debug(`${this.identity} ƒ(${this.inputs}) call ${pulse.size} time(s)`)

        this.queue = new Map
        this.trigger = pulse

        // Since pulse may have multiple outputs generated, we collect
        // all "send" operations and "compress" them into bulk pulse(s).
        for (let data of pulse.values) {
          //debug(data)
          args[idx] = data
          try { this.handler.apply(this, args) }
          catch (e) { e.origin = this; debug(e); throw e; }
        }
        this.transmit()
        debug(`${this.identity} took ${new Date - ts}ms`)
      } else {
        // this pulse was rejected/dropped
        this.mark(pulse, false)
      }
    }
    return false // always prevent propagation of the incoming pulse
  }
  
  use(key, value) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }
  has(key) {
    return super.has(key) || (this.parent ? this.parent.has(key) : false)
  }
  get(...keys) {
    let res = keys.map(key => {
      if (super.has(key)) return super.get(key)
      else return this.parent ? this.parent.get(key) : null
    })
    //debug(this.identity, 'get', keys, res)
    return res.length > 1 ? res : res[0]
  }

  // buffered send
  send(topic, ...values) {
    if (!values.length) return this

    if (!this.queue || !this.queue.has(topic)) {
      // check if key is part of allowed outputs
      if (!Pulse.prototype.match.call({topic}, this.outputs.concat('error')))
        throw new Error("["+this.identity+":send] "+topic+" not in outputs: ["+this.outputs+"]")
    }

    // if no queue, then send it as we observe them
    if (!this.queue) 
      return super.send(...arguments)

    // queue this pulse
    this.queue.has(topic) || this.queue.set(topic, new Pulse(topic, this))
    this.queue.get(topic).add(...values)
    return this
  }

  sendImmediate(key, ...values) { return super.send(...arguments) }

  transmit() {
    for (let [ key, pulse ] of this.queue) {
      this.push(pulse)
      this.queue.delete(key)
      debug(`${this.identity} transmit ${key} (${pulse.size})`)
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
// delegate(Reaction.prototype, 'parent')
//   .getter('io')
//   .method('save')
//   .method('contains')
//   .method('find')
//   .method('load')
//   .method('unload')

module.exports = Reaction

