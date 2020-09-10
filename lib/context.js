const debug = require('./debug').extend('context');
const delegate = require('delegates');
const kProp = Symbol.for('property');
const YangContext = require('yang-js/lib/context');

const Context = Object.assign(Object.create(YangContext), {

  get [Symbol.toStringTag]() { return `Context:${this.uri}` },

  // buffered send
  send(topic, ...values) {
    const { actor, queue } = this
    if (!queue) return actor.push(actor.make(topic).add(...values));
    // Since context can have multiple outputs generated, we collect
    // all "send" operations and "compress" them into bulk token.
    queue.has(topic) || queue.set(topic, [])
    queue.get(topic).push(...values)
    return this
  },
  
  feed(topic, ...values) {
    const { actor } = this
    const pulse = actor.make(topic).add(...values);
    pulse.tags.delete(actor)
    actor.write(pulse)
    return this
  },
  
});

delegate(Context, 'actor')
  .getter('uri')
  .method('make')

delegate(Context, 'node')
  .method('once')
  .method('on')
  .method('off')

module.exports = Context;
