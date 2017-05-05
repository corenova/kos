'use strict'

const { kos = require('..') } = global
const debug = require('debug')

module.exports = kos.create('debug')
  .desc('reactions to send debugging messages to an output stream')
  .init('loggers', new Map)
  .init('level', 0)

  .in('debug/level').bind(setupLogger)

  .in('error').bind(outputError)
  .in('warn').bind(outputMessage)
  .in('info').bind(outputMessage)
  .in('debug').bind(outputMessage)

function setupLogger(level) {
  const loggers = this.get('loggers')
  if (level < 0) return

  this.parent.init('level', level)

  let namespaces = [ 'kos:error', 'kos:warn' ]
  if (level)     namespaces.push('kos:info')
  if (level > 1) namespaces.push('kos:debug')
  if (level > 2) namespaces.push('kos:trace')
  debug.enable(namespaces.join(','))

  loggers.set('error', debug('kos:error'))
  loggers.set('warn',  debug('kos:warn'))
  loggers.set('info',  debug('kos:info'))
  loggers.set('debug', debug('kos:debug'))
  loggers.set('trace', debug('kos:trace'))

  if (level > 2 && !this.get('tracing')) {
    this.parent.on('data', token => {
      if (token.match(['error','warn','info','debug'])) return
      const trace = loggers.get('trace')
      const { key, value } = token
      switch (typeof value) {
      case 'function':
      case 'object':
        trace('%s\n%O\n', key, value)
        break;
      default: 
        trace('%s %o', key, value)
      }
    })
    this.set('tracing', true)
  }
}

function outputError(err) {
  const error = this.get('loggers').get('error')
  const level = this.get('level')
  if (typeof error !== 'function') return
  if (level > 1) error(err)
  else error(err.message)
}

function outputMessage(data) {
  const logger = this.get('loggers').get(this.event)
  if (typeof logger !== 'function') return
  logger(data.join(' '))
}
