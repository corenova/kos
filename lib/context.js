const debug = require('./debug').extend('context');
const delegate = require('delegates');
const kProp = Symbol.for('property');

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
    // Since context can have multiple outputs generated, we collect
    // all "send" operations and "compress" them into bulk token.
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
  save(obj={}, opts) {
    opts = Object.assign({}, { deep: false }, opts);
    this.state.merge(obj, opts);
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
  .method('in')
  .method('get')
  .method('locate')
  .method('lookup')

delegate(Context, 'parent')
  .access('state')

delegate(Context, 'root')
  .getter('store')
  .method('access')

module.exports = Context
