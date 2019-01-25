const debug = require('./debug').extend('context');
const delegate = require('delegates');

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
  save(state={}) {
    const prop = this.merge(state, { suppress: true })
    if (prop.changed)
      this.emit('save', prop.change)
  },
  debug() { this.log('debug', ...arguments) },
  info()  { this.log('info', ...arguments) },
  warn()  { this.log('warn', ...arguments) },
  error() { this.log('error', this.actor.error(...arguments)) },
}

delegate(Context, 'actor')
  .getter('uri')
  .getter('root')
  .getter('parent')
  .method('log')
  .method('use')
  .method('locate')
  .method('lookup')

delegate(Context, 'parent')
  .access('state')
  .method('emit')
  .method('once')
  .method('on')
  .method('in')
  .method('get')
  .method('set')
  .method('merge')

delegate(Context, 'root')
  .getter('store')
  .method('access')

module.exports = Context
