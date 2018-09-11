'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')

const Pulse = require('./pulse')

const Context = {
  feed(topic, ...values) {
    const { actor } = this
    this.write(new Pulse(topic, actor).add(...values))
  },

  // buffered send
  send(topic, ...values) {
    const { queue, actor } = this
    if (!values.length) return this
    // if no queue, then send it as we observe them
    if (!queue) 
      return this.push(new Pulse(topic, actor).add(...values))

    // queue this pulse
    queue.has(topic) || queue.set(topic, new Pulse(topic, actor))
    queue.get(topic).add(...values)
    return this
  },

  sendImmediate(topic, ...values) {
    const { actor } = this
    return this.push(new Pulse(topic, actor).add(...values))
  },

  use(feature) {
    let f = this.depends.get(feature)
    return f.binding ? f.binding() : undefined
  },

  get(...topics) {
    let res = topics.map(topic => this.actor.get(topic))
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
    const { source } = this
    debug(`${source} flush queue...`)
    // transmit queued tokens
    for (let [ topic, pulse ] of this.queue) {
      this.push(pulse)
      this.queue.delete(topic)
      debug(`${source} transmit ${topic} (${pulse.size})`)
    }
    delete this.queue
  },

  debug() { this.log('kos:debug', ...arguments) },
  info()  { this.log('kos:info', ...arguments) },
  warn()  { this.log('kos:warn', ...arguments) },
  
  log(type, ...args) {
    const { actor } = this
    actor.emit('log', new Pulse(type, actor).add(...args))
  }
}

delegate(Context, 'actor')
  .getter('id')
  .getter('root')
  .getter('source')
  .getter('depends')
  .getter('produces')
  .method('write')
  .method('push')
  .method('error')

// The Source Interface
delegate(Context, 'source')
  .access('state')
  .method('save')
  .method('join')
  .method('leave')

module.exports = Context
