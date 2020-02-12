'use strict';

const debug = require('./debug').extend('core');
const uuid = require('uuid');
const delegate = require('delegates');

const kState = Symbol.for('neural:state');
const kDepends = Symbol.for('neural:depends');
const kConsumes = Symbol.for('neural:consumes');
const kProduces = Symbol.for('neural:produces');

const serializeToMap = (x=[]) => new Map([].concat(x).map(i => Array.isArray(i) ? i : [i]));

class Core {

  get depends()  { return this[kDepends]; }
  get consumes() { return this[kConsumes]; }
  get produces() { return this[kProduces]; }
  
  set depends(x)  { this[kDepends] = serializeToMap(x);  }
  set consumes(x) { this[kConsumes] = serializeToMap(x); }
  set produces(x) { this[kProduces] = serializeToMap(x); }

  get active() {
    return this.enabled && Array.from(this.depends.values()).every(x => !!x);
  }
  get ready() {
    return this.active && Array.from(this.consumes.keys()).every(x => this.has(x));
  }
  
  constructor(props={}) {
    const {
      id = uuid(),
      parent,
      enabled = true,
      depends,
      consumes,
      produces,
    } = props;

    this.id = id;
    this.parent = parent;
    this.enabled = enabled;
    this.depends = depends;
    this.consumes = consumes;
    this.produces = produces;
    this[kState] = new Map;
  }
  enable()  { this.enabled = true;  }
  disable() { this.enabled = false; }
  
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
}

delegate(Core.prototype, kState)
  .method('has')
  .method('set')
  .method('get')
  .method('delete')
  .method('clear')

module.exports = Core;
