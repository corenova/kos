'use strict';

const { Actor } = require('./lib');

const schema = require('./kinetic-object-swarm');
global.kos = module.exports = new Actor(schema)
