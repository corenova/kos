'use strict';

const debug = require('./debug').extend('state');
const Yang = require('yang-js');

class State extends Yang.Container {

  commit(opts={}) {
    if (opts.caller === this.parent) return this
    return super.commit(Object.assign(opts, { suppress: true }));
  }

}

module.exports = State;
