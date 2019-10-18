'use strict';

const { Agent, Persona, Reaction } = require('./lib');
const schema = require('./kinetic-object-stream');

module.exports = new Agent(schema);

// expose primary class definitions
module.exports.Agent = Agent;
module.exports.Persona = Persona;
module.exports.Reaction = Reaction;

global.kos = module.exports;
