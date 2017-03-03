'use strict'

const KineticObjectStream = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticEssence = require('./lib/essence')

const path = require('path')

const kos = {
  load(name) {
    let flow
    let search = [ 
      name, 
      path.resolve(name),
      path.resolve(path.join('flows', name)),
      path.join('kos/flows', name) 
    ]
    for (let name of search) {
      try { flow = require(name); break }
      catch (e) { continue }
    }
    if (!(flow instanceof KineticObjectStream))
      throw new Error("unable to load KOS for: " + name)
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
  Essence: KineticEssence,
  
  DEFAULT_HOST: process.env.KOS_HOST || '127.0.0.1',
  DEFAULT_PORT: process.env.KOS_PORT || 12345
}

module.exports = kos['default'] = kos.kos = kos
