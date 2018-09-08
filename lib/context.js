'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')

const Pulse = require('./pulse')
const { kSource } = require('./common')

const Context = {
  feed(topic, ...values) {
    const { source } = this
    this.write(new Pulse(topic, source).add(...values))
  },

  // buffered send
  send(topic, ...values) {
    const { queue, source } = this
    if (!values.length) return this
    // if no queue, then send it as we observe them
    if (!queue) 
      return this.push(new Pulse(topic, source).add(...values))

    // queue this pulse
    queue.has(topic) || queue.set(topic, new Pulse(topic, source))
    queue.get(topic).add(...values)
    return this
  },

  sendImmediate(topic, ...values) {
    const { source } = this
    return this.push(new Pulse(topic, source).add(...values))
  },

  use(feature) {
    let f = this.depends.get(feature)
    return f.binding ? f.binding() : undefined
  },

  get(...topics) {
    let res = topics.map(topic => this[kSource].get(topic))
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
    const { source } = this
    source.emit('log', new Pulse(type, source).add(...args))
  }
}

delegate(Context, kSource)
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
