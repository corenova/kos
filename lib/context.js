'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')
const Stimuli = require('./stimuli')

const proto = module.exports = {
  get(...keys) {
    const { state } = this
    let res = keys.map(key => this.reaction.get(key))
    return res.length > 1 ? res : res[0]
  },

  send(key, ...values) {
    // if already flushed, then send it as we observe them
    if (this.queue.flushed === true) return this.reaction.send(...arguments)
    // check if key is part of allowed outputs
    if (!Stimuli.prototype.match.call({key}, this.outputs))
      throw new Error("["+this.identity+":context:send] "+key+" not in outputs["+this.outputs+"]")
    // preserve the send queue inside this context
    debug(this.id, 'queue', key)
    // preserve an instance of the stimuli inside state machine
    this.queue.has(key) || this.queue.set(key, new Stimuli(key, this.id))
    this.queue.get(key).add(...values)
  },

  flush() {
    for (let [ key, stimuli ] of this.queue) {
      debug(this.id, `flushing ${key} (${stimuli.length})`)
      this.reaction.push(stimuli.compress())
      this.queue.delete(key)
    }
    this.queue.flushed = true
  }
}

delegate(proto, 'reaction')
  .getter('id')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('flow')
  .method('feed') // for self-driven trigger
  .method('seen')
  // state facilities
  .method('has')
  .method('set')
  .method('delete')
  .method('clear')
  // various logging facilities
  .method('debug')
  .method('info')
  .method('warn')
  .method('error')
  .method('throw')

delegate(proto, 'flow')
  .method('save')
