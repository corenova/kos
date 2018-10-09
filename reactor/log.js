'use strict'

const { kos = require('..') } = global
const schema = require('../schema/kinetic-log')

module.exports = kos.create(schema)

  .reaction
  .pre('kos:parent')
  .pre('module/debug')
  .in('kos:log')
  .out('log:level')
  .out('log:handlers')
  .bind(setup)

  .reaction
  .in('console:prompt')
  .bind(saveConsole)

  .reaction
  .pre('log:level')
  .pre('log:handlers')
  .in('error')
  .bind(outputError)

function setup(opts) {
  const parent = this.get('kos:parent')
  const debug = this.get('module/debug')
  const namespaces = [ 'kos:error', 'kos:warn', 'kos:info', 'kos:debug', 'kos:trace' ]

  const { level } = opts
  const handlers = new Map

  if (level > 2) namespaces.push('kos:*')

  if (!this.get('initialized')) {
    debug.enable(namespaces.join(','))
    const logger = token => {
      const { topic, origin, value } = token
      const handler = handlers.get(topic)
      if (typeof handler !== 'function') return
      if (this.has('console')) {
        this.get('console').emit('reset')
      }
      switch (typeof value) {
      case 'function':
      case 'object':
        handler("%s\n%O\n", origin.identity, value)
        break;
      default:
        handler(origin.identity, ...token.values)
      }
    }
    const tracer = token => {
      const trace = handlers.get('trace')
      const logs = [ 'warn','info','debug','trace','error' ]
      if (!trace) return
      const { topic, value } = token
      if (logs.indexOf(topic) !== -1) return
      switch (typeof value) {
      case 'function':
      case 'object':
        trace('%s\n%O\n', topic, value)
        break;
      default: 
        trace('%s %o', topic, value)
      }
    }
    this.set('logger', logger)
    this.set('tracer', tracer)
    this.set('initialized', true)
  }

  //this.save({ level, handlers })

  if (level < 0) {
    this.info('logging disabled')
    parent.removeListener('log', this.get('logger'))
  } else  {
    parent.on('log', this.get('logger'))
    handlers.set('error', debug('kos:error'))
    this.info('logging initialized to level', level)
  }
  if (level) {
    handlers.set('warn', debug('kos:warn'))
    handlers.set('info', debug('kos:info'))
  }
  if (level > 1) handlers.set('debug', debug('kos:debug'))
  if (level > 2) handlers.set('trace', debug('kos:trace'))

  if (level > 2) parent.on('data', this.get('tracer'))
  else parent.removeListener('data', this.get('tracer'))

  this.send('log:level', level)
  this.send('log:handlers', handlers)
}

function saveConsole(console) { this.save({ console }) }

function outputError(err) {
  const [ level, handlers ] = this.get('log:level','log:handlers')
  const error = handlers.get('error')
  const { origin, message } = err
  if (typeof error !== 'function') return
  if (this.has('console')) 
    this.get('console').emit('reset')
  if (level) error(err)
  else error(message)
}
