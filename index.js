'use strict';

const { Agent } = require('./lib');

const schema = require('./kinetic-object-stream');
global.kos = module.exports = new Agent(schema)
