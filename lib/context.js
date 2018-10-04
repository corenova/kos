'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')

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
    const { queue } = this
    if (!values.length) return this
    if (!queue) return this.push(this.create(topic, ...values))
    queue.has(topic) || queue.set(topic, [])
    queue.get(topic).push(...values)
    return this
  },
  flush() {
    const { queue } = this
    debug(`${this} flush queue...`)
    // transmit queued tokens
    for (let [ topic, values ] of queue) {
      debug(`${this} transmit ${topic} (${values.length})`)
      this.push(this.create(topic, ...values))
      queue.delete(topic)
    }
    delete this.queue
  },

  debug() { this.log('kos:debug', ...arguments) },
  info()  { this.log('kos:info', ...arguments) },
  warn()  { this.log('kos:warn', ...arguments) }
  
}

delegate(Context, 'actor')
  .getter('uri')
  .getter('root')
  .getter('parent')
  .method('create')
  .method('use')
  .method('push')
  .method('log')
  .method('error')
  .method('locate')
  .method('lookup')

delegate(Context, 'parent')
  .access('state')
  .method('feed') // XXX - need a better solution
  .method('in')
  .method('on')
  .method('has')
  .method('get')
  .method('set')
  .method('save')
  .method('join')
  .method('leave')

module.exports = Context
