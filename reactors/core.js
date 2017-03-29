'use strict'

const kos = require('..')

module.exports = kos
  .reactor('core', 'Provides KOS reactor loading & logging facility')
  .setState('reactors', new Map)

  .in('load').out('reactor').use('module/path').bind(loadReactor)
  .in('reactor').out('load').bind(chainReactor)

  .in('log').use('module/debug').bind(setupLogger)

function loadReactor(name) {
  let path = this.fetch('module/path')
  let reactor = {}
  let search = [ 
    path.resolve(name),
    path.resolve(path.join('reactors', name)),
    path.resolve(__dirname, path.join('reactors', name)),
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
  this.parent.pipe(reactor).pipe(this.parent)
  reactors.set(reactor.label, reactor)
}

function setupLogger({ verbose=0, silent=false }) {
  if (silent) return
  let debug = this.fetch('module/debug')
  let namespaces = [ 'kos:error', 'kos:warn' ]
  if (verbose)     namespaces.push('kos:info')
  if (verbose > 1) namespaces.push('kos:debug')
  if (verbose > 2) namespaces.push('kos:trace')
  debug.enable(namespaces.join(','))

  let error = debug('kos:error')
  let warn  = debug('kos:warn')
  let info  = debug('kos:info')
  let log   = debug('kos:debug')
  let trace = debug('kos:trace')

  if (!this.get('initialized')) {
    this.parent.on('data', ({ key, value }) => {
      switch (key) {
      case 'error':
        if (verbose > 1) error(value)
        else error(value.message)
        break
      case 'warn':  warn(value.join(' ')); break
      case 'info':  info(value.join(' ')); break
      case 'debug': log(value.join(' ')); break
      default:
        // if (key === 'kos')
        //   trace(render(value)+"\n")
        switch (typeof value) {
        case 'function':
        case 'object':
          trace('%s\n%O\n', key, value)
          break;
        default: trace('%s %o', key, value)
        }
      }
    })
    this.set('initialized', true)
  }
}
