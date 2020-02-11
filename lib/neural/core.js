'use strict';

const debug = require('debug')('neural:core');
const uuid = require('uuid');
const delegate = require('delegates');

const kState = Symbol.for('neural:state');
const kConsumes = Symbol.for('neural:consumes');
const kProduces = Symbol.for('neural:produces');

class Core {

  get consumes() { return this[kConsumes] }
  get produces() { return this[kProduces] }
  set consumes(x=[]) {
    x = [].concat(x).map(i => [i])
    this[kConsumes] = new Map(x)
  }
  set produces(x=[]) {
    x = [].concat(x).map(i => [i])
    this[kProduces] = new Map(x)
  }

  constructor(props={}) {
    const {
      id = uuid(),
      parent,
      active = true,
      consumes,
      produces,
    } = props;

    this.id = id;
    this.active = active;
    this.parent = parent;
    this.consumes = consumes;
    this.produces = produces;
    this[kState] = new Map;
  }
  enable()  { this.active = true;  }
  disable() { this.active = false; }
}

delegate(Core.prototype, kState)
  .method('has')
  .method('set')
  .method('get')
  .method('delete')
  .method('clear')

module.exports = Core;
