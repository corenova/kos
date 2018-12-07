'use strict';

const { Actor } = require('./lib');

const schema = require('./kinetic-object-stream');
global.kos = module.exports = new Actor(schema)
