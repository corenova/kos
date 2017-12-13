'use strict'
const { kos = require('..') } = global

const log  = require('./log')
const resolve = require('./resolve')
const console = require('./console')

module.exports = kos.create('node')
  .desc('reactions to Node.js runtime context')
  .pass(true)
  .load(log)
  .load(resolve)
  .load(console)

  .in('process')
  .out('persona')
  .bind(initialize)

  .in('program','process')
  .out('load', 'read', 'show', 'log', 'stdio')
  .bind(start)

  .in('persona')
  .out('require')
  .bind(absorbPersona)

// self-initialize
function initialize(process) { 
  this.send('persona', this.parent)
}

function start(program, process) {
  const { stdin, stdout, stderr } = process
  const { args=[], expr=[], file=[], show=false, silent=false, verbose=0 } = program

  let io = this.io({
    persona: false,
    error: false // ignore error topics
  })

  // unless silent, turn on logging
  silent || this.send('log', { level: verbose })

  args.forEach(x => this.send('load', x))
  process.nextTick(() => {
    expr.forEach(x => io.write(x + "\n"))
    file.forEach(x => this.send('read', x))
  })

  if (show) return this.send('show', true)

  if (stdin.isTTY && stdout.isTTY) this.send('stdio', io)
  else stdin.pipe(io, { end: false }).pipe(stdout)

  this.info('started KOS Node.js persona...')
}

function absorbPersona(persona) { 
  if (!(persona instanceof kos.Persona)) return
  const regex = /^module\/(.+)$/
  persona.join(this.reactor)
  persona.enabled && persona.requires.forEach(key => {
    let match = key.match(regex, '$1')
    if (!match) return
    this.send('require', match[1])
  })
}

