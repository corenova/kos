'use strict'

const { kos = require('..') } = global

module.exports = kos.create('log')
  .desc('reactions to send logging messages to an output stream')

  .init({ 
    'module/debug': require('debug'),
    'log/level': 0,
    loggers: new Map,
    namespaces: [ 'kos:error', 'kos:warn', 'kos:info', 'kos:debug', 'kos:trace' ]
  })

  .pre('module/debug')
  .in('log')
  .out('log/level','warn','info','debug','error')
  .bind(initialize)

  .in('error').bind(outputError)
  .in('warn').bind(outputMessage)
  .in('info').bind(outputMessage)
  .in('debug').bind(outputMessage)

function initialize(opts) {
  const debug = this.get('module/debug')
  const { level } = opts
  if (!this.get('initialized')) {
    debug.enable(this.get('namespaces').join(','))
    this.set('initialized', true)
  }
  const loggers = this.get('loggers')
  // start fresh
  loggers.clear()

  this.save({ 'log/level': level })

  if (level < 0) return // silent and we don't want any log outputs

  loggers.set('error', debug('kos:error'))
  kos.on('log', token => {
    const level = this.get('log/level')
    this.push(token)
  })

  if (level) {
    loggers.set('warn', debug('kos:warn'))
    loggers.set('info', debug('kos:info'))
  }
  if (level > 1) loggers.set('debug', debug('kos:debug'))
  if (level > 2) loggers.set('trace', debug('kos:trace'))

  if (level > 2) {
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
  this.info('logging initialized to level', level)
  this.send('log/level', level)
}

function outputError(err) {
  const level = this.get('log/level')
  const error = this.get('loggers').get('error')
  const { origin, message } = err
  if (typeof error !== 'function') return
  kos.emit('clear')
  if (level) error(err)
  else error(message)
  if (level > 1) error(origin)
}

function outputMessage(data) {
  const logger = this.get('loggers').get(this.type)
  if (typeof logger !== 'function') return
  kos.emit('clear')
  logger(...data)
}
