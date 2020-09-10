'use strict';

const debug = require('./debug').extend('reaction');
const Node = require('./node');
const Context = require('./context');

class Reaction extends Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}`; }
  get type()  { return Symbol.for('kos:reaction'); }

  get ready() { return (typeof this.binding === 'function') && super.ready; }

  get context() {
    const ctx = Object.create(Context);
    ctx.actor = this;
    ctx.opts = { actor: this };
    ctx.node = this.parent.model; // context is the parent reactor's data model
    ctx.queue = new Map;
    return ctx;
  }
  //
  // Reaction Processing
  //
  async activate(pulse, done) {
    if (!this.update(pulse)) return done();
    
    const { context, consumes, binding } = this;
    const { queue } = context;
    const ts = new Date;
    const inputs = Array.from(consumes.keys());
    const idx  = inputs.indexOf(pulse.schema);
    const args = inputs.map(k => this.core.get(k).data).concat(context);
    
    // TODO: clear the local state for input triggers?
    debug(`${this.uri} ƒ(${inputs.map(x => x.datakey)}) call ${pulse.size} time(s)`)
    context.trigger = pulse;
    context.inputs = inputs.map(k => this.core.get(k));
    
    for (let data of pulse.values) {
      args[idx] = data
      try { await binding(context, ...args) }
      catch (e) { context.logError(e); }
    }
    // flush all values inside context.queue
    for (let [ topic, values ] of queue) {
      debug(`${this.uri} transmit ${topic} (${values.length})`)
      this.push(this.make(topic).add(...values));
      queue.delete(topic)
    }
    delete context.queue;
    
    // clear transient reaction triggers
    for (let [schema, opts] of consumes) {
      opts.persist || this.core.delete(schema)
    }
    debug(`${this.uri} took ${new Date - ts}ms`)
    return done()
  }
}

module.exports = Reaction;
