'use strict'

// const Agent     = require('./agent');
// const Persona   = require('./persona');
// const Interface = require('./interface');
// const Reaction  = require('./reaction');
// const Channel   = require('./channel');
// const Filter    = require('./filter');
// const Pulse     = require('./pulse');
// const Neural    = require('./neural');

const { Container } = require('yang-js');
const Connector = Container;
const Controller = Container;
const Dataflow = require('./dataflow');
const Generator = Container;
const Processor = Container;
const Terminator = Container;

module.exports = {
  Connector, Controller, Dataflow, Generator, Processor, Terminator
}
