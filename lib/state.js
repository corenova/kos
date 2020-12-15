'use strict';

const debug = require('./debug').extend('state');
const Yang = require('yang-js');

class State extends Yang.Container {

  commit(opts={}) {
    return super.commit(Object.assign(opts, { suppress: true }));
  }

}

module.exports = State;
