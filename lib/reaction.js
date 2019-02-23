'use strict';

const debug = require('./debug').extend('reaction');
const Node = require('./node');
const Context = require('./context');

class Reaction extends Node {

  get [Symbol.toStringTag]() { return `Reaction:${this.uri}`; }
  get type()  { return Symbol.for('kos:reaction'); }

  get filter() { return true; }
  get ready() {
    return this.active && Array.from(this.consumes.keys()).every(x => this.core.has(x));
  }
  get context() {
    let ctx = Object.create(Context)
    ctx.actor = this
    ctx.queue = new Map
    return ctx
  }
  set active(x) { this._active = x; }
  get active()  { return this._active && (typeof this.binding === 'function') }

  //
  // Reaction Processing
  //
  activate(pulse, done) {
    if (!super.activate(pulse)) return done();
    
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
      try { binding.apply(context, args) }
      catch (e) { context.error(e); }
    }
    // flush all values inside context.queue
    for (let [ topic, values ] of queue) {
      debug(`${this.uri} transmit ${topic} (${values.length})`)
      this.push(this.make(topic, ...values))
      queue.delete(topic)
    }
    delete context.queue;
    
    // clear transient reaction triggers
    for (let [schema, opts] of consumes)
      opts.persist || this.core.delete(schema)
    debug(`${this.uri} took ${new Date - ts}ms`)
    return done()
  }
  // XXX - FOR NOW
  push(pulse) {
    if (this.produces.has(pulse.schema)) super.push(pulse);
    else throw this.error(`${pulse.topic} is not one of produced schemas`, pulse);
  }
}

module.exports = Reaction
