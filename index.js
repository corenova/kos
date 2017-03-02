'use strict'

const KineticObjectStream = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticTrigger = require('./lib/trigger')

const path = require('path')

const kos = {
  // load an existing Flow or Flow from file
  load(filename) {
    let flow
    try {
	  flow = require(filename)
    } catch (e) {
	  flow = require(path.resolve(filename))
    }
    if (!(flow instanceof KineticObjectStream))
      throw new Error("unable to load KOS from: " + filename)
    return flow
  },

  create(opts) { 
    return new KineticObjectStream(opts) 
  },

  chain(...flows) {
    flows = flows.filter(flow => flow instanceof KineticObjectStream)
    let head = flows.shift()
    let tail = flows.reduce(((a, b) => a.pipe(b)), head)
    return [ head, tail ]
  },

  Stream: KineticObjectStream,
  Reactor: KineticReactor,
  Trigger: KineticTrigger
}

module.exports = kos['default'] = kos.kos = kos
