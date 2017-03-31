'use strict'

const { kos = require('..') } = global

module.exports = kos
  .reactor('debug', 'Provides KOS debug output facility')
  .in('debug/config').use('module/debug').bind(setupLogger)

function setupLogger({ verbose=0 }) {
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
