'use strict'

const debug = require('debug')
const path = require('path')

const KineticObjectStream = require('./stream')

module.exports = new KineticObjectStream('core')
  .summary('Provides KOS flow loading & logging facility')
  .default('flows', new Map)
  .in('load').out('flow').bind(loadFlow)
  .in('flow').out('load').bind(includeFlow)
  .in('log').bind(setupLogger)

function loadFlow(name) {
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

  this.send('flow', flow)
}

function includeFlow(flow) { 
  let flows = this.fetch('flows')
  this.stream.include(flow)
  flows.set(flow.label, flow)
}

function setupLogger({ verbose=0, silent=false }) {
  if (silent) return

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
    this.stream.on('data', ({ key, value }) => {
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
