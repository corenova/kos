'use strict';

const { Actor } = require('./lib');

const schema = require('./kinetic-object-swarm');
const kos = new Actor(schema);

global.kos = module.exports = kos
