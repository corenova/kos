'use strict'

const { kos = require('..') } = global

module.exports = kos.create('log')
  .desc('reactions to send logging messages to an output stream')

  .pre('module/debug')
  .in('log')
  .bind(setup)

  .in('prompt').bind(savePrompt)
  .pre('log').in('error').bind(outputError)

function setup(opts) {
  const debug = this.get('module/debug')
  const namespaces = [ 'kos:error', 'kos:warn', 'kos:info', 'kos:debug', 'kos:trace' ]

  const { level } = opts
  const { parent } = this.flow
  const handlers = new Map

  if (!this.get('initialized')) {
    debug.enable(namespaces.join(','))
    const logger = token => {
      const { topic, origin } = token
      const handler = this.get('handlers').get(topic)
      if (typeof handler !== 'function') return
      if (this.has('prompt')) {
        this.get('prompt').emit('clear')
      }
      handler(origin.identity, ...token)
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
    this.save({ logger, tracer })
    this.set('initialized', true)
  }

  this.save({ level, handlers })

  if (level < 0) {
    this.info('logging disabled')
    parent.removeListener('log', this.get('logger'))
  } else  {
    this.info('logging initialized to level', level)
    parent.on('log', this.get('logger'))
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
}

function savePrompt(prompt) { this.save({ prompt }) }

function outputError(err) {
  const [ level, handlers ] = this.get('level','handlers')
  const error = handlers.get('error')
  const { origin, message } = err
  if (typeof error !== 'function') return
  if (this.has('prompt')) 
    this.get('prompt').emit('clear')
  if (level) error(err)
  else error(message)
}
