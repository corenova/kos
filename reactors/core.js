'use strict'

const { kos = require('..') } = global

module.exports = kos
  .reactor('core', 'Provides KOS reactor loading & logging facility')
  .setState('reactors', new Map)

  .in('load').out('reactor').use('module/path').bind(loadReactor)
  .in('reactor').out('load').bind(chainReactor)

function loadReactor(name) {
  let path = this.fetch('module/path')
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
  let reactors = this.fetch('reactors')
  this.parent.chain(reactor)
  reactors.set(reactor.label, reactor)
}
