/**
 * @fileoverview Reactor
 * @author sekur (Peter Lee)
 */
'use strict';

const debug = require('./debug').extend('reactor');
const delegate = require('delegates');
// local modules
const Node = require('./node');

class Reactor extends Node {

  get [Symbol.toStringTag]() { return `Reactor:${this.uri}`; }
  get type() { return Symbol.for('kos:reactor'); }
  get active() { return super.active && this.ready; }
  get ready() {
    return ((this.istream && this.istream.active) &&
	    (this.ostream && this.ostream.active));
  }
  
  add(child) {
    super.add(child);
    switch (child.kind) {
    case 'input':
      // listen for changes in the input node and write into core
      child.on('change', prop => this.core.write(prop)); break;
    case 'output':
      // listen for data from the core and merge into the output node
      this.core.on('data', data => child.merge(data)); break;
    }
  }
  
  //
  // Reaction Processing
  //
  activate(pulse, done) {
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
  // overrides

}

delegate(Reactor.prototype, 'istream')
  .method('write')

delegate(Reactor.prototype, 'ostream')
  .method('read')
  .method('pipe')

module.exports = Reactor;
