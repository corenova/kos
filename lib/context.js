'use strict';

const debug = require('debug')('kos:trigger')
const delegate = require('delegates')

const { Pulse } = require('./neural')

const kSource = Symbol.for('source')

const Context = {
  feed(key, ...values) {
    this.write(new Pulse(key, this).add(...values))
  },

  // buffered send
  send(key, ...values) {
    const { queue } = this
    if (!values.length) return this
    // if no queue, then send it as we observe them
    if (!queue) 
      return this.push(new Pulse(key, this).add(...values))

    // queue this token
    queue.has(key) || queue.set(key, new Pulse(key, this))
    queue.get(key).add(...values)
    return this
  },

  use(feature) {
    return this.depends.get(feature)
  },

  get(...keys) {
    let res = keys.map(key => this[kSource].get(key))
    return res.length > 1 ? res : res[0]
  },

  after(timeout, max) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(Math.round(Math.min(max, timeout * 1.5)))
      }, timeout)
    })
  },

  flush() {
    // transmit queued tokens
    for (let [ key, pulse ] of this.queue) {
      this.push(pulse)
      this.queue.delete(key)
      debug(`${this.identity} transmit ${key} (${pulse.size})`)
    }
    delete this.queue
  }
}

delegate(Context, kSource)
  .getter('id')
  .getter('source')
  .getter('depends')
  .method('write')
  .method('push')
  .method('locate')
  .method('lookup')

// The Source Persona
delegate(Context, 'source')
  .access('state')
  .method('save')
  .method('join')
  .method('leave')

module.exports = Context
