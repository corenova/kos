'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')
const equal = require('deep-equal');

const Context = {

  get [Symbol.toStringTag]() { return `Context:${this.uri}` },

  after(timeout, max) {
    timeout = parseInt(timeout) || 100
    max = parseInt(max) || 5000
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Math.round(Math.min(max, timeout * 1.5)))
      }, timeout)
    })
  },
  // buffered send
  send(topic, ...values) {
    const { actor, queue } = this
    if (!values.length) return this
    if (!queue) return actor.push(actor.make(topic, ...values))
    queue.has(topic) || queue.set(topic, [])
    queue.get(topic).push(...values)
    return this
  },
  feed(topic, ...values) {
    const { actor } = this
    const pulse = actor.make(topic, ...values)
    pulse.tags.delete(actor)
    actor.write(pulse)
    return this
  },
  flush() {
    const { actor, queue } = this
    // transmit queued tokens
    for (let [ topic, values ] of queue) {
      debug(`${this} transmit ${topic} (${values.length})`)
      actor.push(actor.make(topic, ...values))
      queue.delete(topic)
    }
    delete this.queue
  },
  save(state) {
    if (!this.state) {
      debug(`${this} initializing state...`, state)
      this.state = state
      this.emit("save", state)
      return this
    }
    if (typeof state === "object") {
      //const arrayMerge = (d,s,o) => s
      const keys = Object.keys(state)
      const prev = this.state
      const change = Object.create(null)
      debug(`${this} saving new state for: ${keys}`, state)
      debug(`${this} prev is:`, prev)
      for (let k of keys) {
        if (!equal(prev[k], state[k])) {
          let prop = this.in(k)
          try {
            prop.merge(state[k], { suppress: true })
            change[k] = state[k]
          } catch (e) {
            debug(`unable to merge data for state key ${k}`, e)
          }
        }
      }
      if (Object.keys(change).length) {
        debug(`${this} changed for: ${Object.keys(change)}`, this.state)
        //this.state = merge(prev, state, { arrayMerge })
        this.emit("save", change)
      }
    }
    return this
  },
  
  debug() { this.log('kos:debug', ...arguments) },
  info()  { this.log('kos:info', ...arguments) },
  warn()  { this.log('kos:warn', ...arguments) },
  log(topic, ...args) {
    const { root, actor } = this
    root.emit('log', actor.make(topic, args));
  }
}

delegate(Context, 'actor')
  .getter('uri')
  .getter('root')
  .getter('parent')
  .method('use')
  .method('error')
  .method('locate')
  .method('lookup')

delegate(Context, 'parent')
  .access('state')
  .method('emit')
  .method('on')
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

module.exports = Context
