'use strict';

const debug = require('debug')('kos:network')
const Synapse = require('./synapse')

class Network extends Synapse {
  
  get [Symbol.toStringTag]() { return 'Network' }
  get type() { return Symbol.for('kos:network') }

}

module.exports = Network
