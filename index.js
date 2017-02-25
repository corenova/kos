'use strict'

const KineticObjectStream = require('./lib/stream')

const path = require('path')

const kos = {
  // load an existing Stream or Flow from file
  load(filename) {
    let stream
    try {
	  stream = require(filename)
    } catch (e) {
	  stream = require(path.resolve(filename))
    }
    if (!(stream instanceof KineticObjectStream))
      throw new Error("unable to load KOS from: " + filename)
    return stream
  },

  create(opts) { 
    return new KineticObjectStream(opts) 
  },

  Stream: KineticObjectStream,
  Reactor: require('./lib/reactor'),
  Trigger: require('./lib/trigger')
}

module.exports = kos['default'] = kos.kos = kos

// for debugging, you can pipe your flow to this
// ex. myFlow.pipe(kos.debug)
try { const debug = require('debug')('kos/debug') }
catch (e) { const debug = console.log }

kos.debug = (new kos.Reactor).bind(function log(msg) {
  debug(msg.key)
  debug(msg.value)
})
