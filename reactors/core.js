'use strict'

const { kos = require('..') } = global
const requireReactor = require('./require')

module.exports = kos.reactor('core')
  .desc('Provides KOS reactor loading & require facility')
  .init('reactors', new Map)
  .chain(requireReactor)

  .in('load').and.has('module/path').out('reactor').bind(loadReactor)
  .in('reactor').bind(chainReactor)

function loadReactor(name) {
  let path = this.get('module/path')
  let reactor = {}
  let search = [ 
    path.resolve(name),
    path.resolve(path.join('reactors', name)),
    path.resolve(__dirname, name),
    name
  ]
  for (let name of search) {
    try { reactor = require(name); break }
    catch (e) { 
      if (e.code !== 'MODULE_NOT_FOUND') throw e
    }
  }
  if (reactor.type !== Symbol.for('kinetic.reactor'))
    throw new Error("unable to load KOS for " + name + " from " + search)

  this.send('reactor', reactor)
}

function chainReactor(reactor) { 
  let reactors = this.get('reactors')
  this.parent.chain(reactor)
  reactors.set(reactor.name, reactor)
}
