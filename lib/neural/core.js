'use strict';

const debug = require('./debug').extend('core');
const uuid = require('uuid');
const delegate = require('delegates');
const { Transform } = require('stream');

const kCore = Symbol.for('neural:core');
const kScope = Symbol.for('neural:scope');
const kState = Symbol.for('neural:state');

// default values for streams
// NOTE: these are not hard limits, but a warning will be generated if exceeded
const DEFAULT_HIGH_WATERMARK = 100;
const DEFAULT_MAX_LISTENERS = 50;

class Core extends Transform {

  static ArrayToMap(x=[]) { return new Map([].concat(x).map(i => Array.isArray(i) ? i : [i])); }

  [Symbol.toPrimitive](x) { return kCore }
  
  get [Symbol.toStringTag]() { return `Core:${this.id}` }
  get type() { return Symbol.for('neural:core') }

  get scope()  { return this[kScope]; }
  set scope(x) { this[kScope] = Core.ArrayToMap(x); }
  get topics() { return Array.from(this.scope.keys()); }

  get active() {
    return this.topics.every(x => {
      for (const core of this.writers) {
	if (core.scope.has(x)) return true;
      }
      return false;
    });
  }
  
  get ready() {
    return this.active && Array.from(this.scope.keys()).every(x => this.has(x));
  }
  
  constructor(props={}) {
    const {
      scope,
      objectMode = false,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners  = DEFAULT_MAX_LISTENERS,
    } = props;

    super({ objectMode, highWaterMark });
    this.setMaxListeners(maxListeners);

    this.scope = scope;
    this.writers = new Set; // cores that write to this
    this.readers = new Set; // cores that read from this
    this[kState] = new Map;

    if (typeof activate === 'function')
      this.activate = activate.bind(this);
  }
  enable()  { this.enabled = true;  }
  disable() { this.enabled = false; }

  activate(chunk, done) { done(this.error("no activation function defined!")) }
  //
  // Transform Implementation
  // 
  _transform(chunk, encoding, done) {
    try { this.activate(chunk, done); }
    catch (e) {
      this.log('error', this.error(e));
      done();
    }
  }
  // Core dataflow pipeline (this-to-core)
  pipe(core) { // override to ensure compatibility between Core instances
    if (core instanceof Core && !this.canPipeTo(core)) return null;
    if (this.readers.has(core)) return core; // already reading from this
    debug(`${this} ===> ${core}`);
    core = super.pipe(core);
    if (core instanceof Core) {
      this.readers.add(core);
      core.writers.add(this);
    }
    return core;
  }
  unpipe(core) {
    if (this.readers.has(core)) {
      this.readers.delete(core);
      core.writers.delete(this);
    }
    debug(`${this} =X=> ${core}`);
    super.unpipe(core);
  }
  canPipeTo(core) {
    if (core instanceof Core) {
      for (let [output] of this.produces)
	for (let [input] of core.consumes)
          if (output === input) return true;
    }
    return false;
  }
  //
  // Helper Functions
  //
  update(key, value) {
    if (this.depends.has(key)) {
      this.depends.set(key, value);
      return false;
    }
    if (!this.active) return false;
    if (!this.consumes.has(key)) return false;

    // check if value conforms to the consumes filter option
    const opts = this.consumes.get(key);
    if (opts && typeof opts.filter === 'function') {
      if (!opts.filter(value)) return false;
    }
    this.set(key, value);
    return true;
  }
  inspect() {
    const { id, type, active, ready, depends, consumes, produces } = this;
    return { 
      id, type, active, ready,
      depends: Array.from(depends.keys()),
      consumes: Array.from(consumes.keys()),
      produces: Array.from(produces.keys()),
    }
  }
}

delegate(Core.prototype, kState)
  .method('keys')
  .method('has')
  .method('set')
  .method('get')
  .method('delete')
  .method('clear')

module.exports = Core;
