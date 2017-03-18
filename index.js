'use strict'

Object.assign || require('object.assign').shim()
Array.from || require('array.from').shim()

const KineticObjectStream = require('./lib/stream')
const KineticReactor = require('./lib/reactor')
const KineticEssence = require('./lib/essence')

const path = require('path')

const kos = {
  load(name) {
    let flow = {}
    let search = [ 
      path.resolve(name),
      path.resolve(path.join('flows', name)),
      path.resolve(__dirname, path.join('flows', name)),
      name
    ]
    for (let name of search) {
      try { flow = require(name); break }
      catch (e) { 
        if (e.code !== 'MODULE_NOT_FOUND') throw e
      }
    }
    if (flow.type !== 'KineticObjectStream')
      throw new Error("unable to load KOS for " + name + " from " + search)
    return flow
  },
  create(opts) { 
    return new KineticObjectStream(opts) 
  },
  chain(...flows) {
    let map = {}
    flows = flows.filter(flow => flow.type === 'KineticObjectStream')
    for (let flow of flows) map[flow.label] = flow
    flows = Object.keys(map).map(key => map[key])
    let head = flows.shift()
    let tail = flows.reduce(((a, b) => a.pipe(b)), head)
    head && tail && tail.pipe(head)
    return [ head, tail ]
  },
  filter(...keys) {
    let triggers = new Set(keys)
    return new KineticEssence({
      transform(ko, enc, cb) {
        ko && ko.match(triggers) ? cb(null, ko) : cb()
      }
    })
  },

  Stream: KineticObjectStream,
  Reactor: KineticReactor,
  Essence: KineticEssence,
  
  DEFAULT_HOST: process.env.KOS_HOST || '127.0.0.1',
  DEFAULT_PORT: process.env.KOS_PORT || 12345
}

global.kos = module.exports = kos['default'] = kos.kos = kos

