'use strict'

const { kos = require('..') } = global

module.exports = kos.create('log')
  .desc('reactions to send logging messages to an output stream')

  .pre('module/debug')
  .in('log')
  .out('log/level','log/handlers','warn','info','debug','error')
  .bind(initialize)

  .in('prompt').bind(savePrompt)

  .pre('log/level')
  .pre('log/handlers')
  .in('error').bind(outputError)

  .pre('log/level')
  .pre('log/handlers')
  .in('warn').bind(outputMessage)

  .pre('log/level')
  .pre('log/handlers')
  .in('info').bind(outputMessage)

  .pre('log/level')
  .pre('log/handlers')
  .in('debug').bind(outputMessage)

function initialize(opts) {
  const debug = this.get('module/debug')
  const namespaces = [ 'kos:error', 'kos:warn', 'kos:info', 'kos:debug', 'kos:trace' ]

  const { level } = opts
  const { parent } = this.flow
  const handlers = new Map

  if (!this.get('initialized')) {
    debug.enable(namespaces.join(','))
    this.set('observer', token => this.push(token))
    this.set('tracer', token => {
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
    })
    this.set('initialized', true)
  }

  if (level < 0) {
    this.info('logging disabled')
    parent.removeListener('log', this.get('observer'))
  } else  {
    this.info('logging initialized to level', level)
    parent.on('log', this.get('observer'))
    handlers.set('error', debug('kos:error'))
  }
  if (level) {
    handlers.set('warn', debug('kos:warn'))
    handlers.set('info', debug('kos:info'))
  }
  if (level > 1) handlers.set('debug', debug('kos:debug'))
  if (level > 2) handlers.set('trace', debug('kos:trace'))

  if (level > 2) this.flow.on('data', this.get('tracer'))
  else this.flow.removeListener('data', this.get('tracer'))

  this.send('log/level', level)
  this.send('log/handlers', handlers)
}

function savePrompt(prompt) { this.save({ prompt }) }

function outputError(err) {
  const [ level, handlers ] = this.get('log/level','log/handlers')
  const error = handlers.get('error')
  const { origin, message } = err
  if (typeof error !== 'function') return
  if (this.has('prompt')) 
    this.get('prompt').emit('clear')
  if (level) error(err)
  else error(message)
}

function outputMessage(data) {
  const [ level, handlers ] = this.get('log/level','log/handlers')
  const logger = handlers.get(this.type)
  if (typeof logger !== 'function') return
  if (this.has('prompt')) {
    this.get('prompt').emit('clear')
  }
  logger(...data)
}
