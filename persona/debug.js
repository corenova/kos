'use strict'

const { kos = require('..') } = global

module.exports = kos.create('debug')
  .desc('reactions to send debugging messages to an output stream')

  .init({ 
    'module/debug': require('debug'),
    loggers: new Map,
    namespaces: [ 'kos:error', 'kos:warn', 'kos:info', 'kos:debug', 'kos:trace' ]
  })

  .pre('module/debug')
  .in('debug/level')
  .bind(initialize)

  .pre('debug/level')
  .in('error').bind(outputError)

  .in('warn').bind(outputMessage)
  .in('info').bind(outputMessage)
  .in('debug').bind(outputMessage)

function initialize(level) {
  const debug = this.get('module/debug')
  if (!this.get('initialized')) {
    debug.enable(this.get('namespaces').join(','))
    this.set('initialized', true)
  }
  const loggers = this.get('loggers')
  // start fresh
  loggers.clear()

  if (level < 0) return // silent and we don't want any log outputs
  loggers.set('error', debug('kos:error'))
  if (level)     loggers.set('warn',  debug('kos:warn'))
  if (level > 1) loggers.set('info',  debug('kos:info'))
  if (level > 2) loggers.set('debug', debug('kos:debug'))
  if (level > 3) loggers.set('trace', debug('kos:trace'))

  if (level > 3) {
    this.flow.on('data', token => {
      const trace = loggers.get('trace')
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
    })
  }
}

function outputError(err) {
  const level = this.get('debug/level')
  const error = this.get('loggers').get('error')
  const { origin, message } = err
  if (typeof error !== 'function') return
  if (level > 1) error(err)
  else error(message)
  if (level > 2) error(origin)
}

function outputMessage(data) {
  const logger = this.get('loggers').get(this.type)
  if (typeof logger !== 'function') return
  kos.emit('clear') // XXX - this is a hack
  logger(...data)
}
