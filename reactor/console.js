'use strict'

const { kos = require('..') } = global

const render = require('./render')

// TODO: shouldn't be explicit dependency?
const colors = require('colors')
const schema = require('../schema/kinetic-console')

module.exports = kos.create(schema)
  .load(render)

  .reaction
  .in('node:process')
  .in('node:program')
  .out('console:io')
  .bind(initialize)

  .reaction
  .pre('module/readline')
  .pre('node:process')
  .in('console:io')
  .out('console:prompt','console:line')
  .bind(createConsole)

  .reaction
  .pre('node:process')
  .pre('console:io')
  .in('console:prompt')
  .out('render:info')
  .bind(processInput)

  .reaction
  .pre('node:process')
  .pre('node:program')
  .in('kos:reactor')
  .out('render:reactor')
  .bind(renderReactor)

function initialize(process, program) {
  const { parent } = this
  const { stdin, stdout, stderr } = process
  const { show=false } = program
  const { io } = kos

  if (show) return

  if (stdin.isTTY) {
    this.send('console:io', { 
      input: stdin, output: stderr, source: kos
    })
  } else stdin.pipe(io)

  stdout.isTTY || io.pipe(stdout)

  this.info('started console...')
}

function createConsole(io) {
  const regex = /^module\//
  const [ process, readline ] = this.get('node:process', 'module/readline')
  const { input, output, source } = io

  const console = readline.createInterface({
    input, output, 
    prompt: colors.grey(source.identity + '> '),
    completer: (line) => {
      let inputs = source.accepts.filter(x => !source.depends.includes(x))
      let completions = inputs.sort().concat('.info','.help','.quit')
      const hits = completions.filter(c => c.indexOf(line) === 0)
      if (/\s+$/.test(line)) completions = []
      return [hits.length ? hits : completions, line]
    }
  })

  console.on('reset', resetPrompt)
  console.prompt(true)
  source.on('reject', token => this.warn(`ignoring unknown topic: ${token.topic}`))

  this.send('console:prompt', console)

  function resetPrompt() {
    readline.clearLine(output, -1)
    readline.cursorTo(output, 0)
    process.nextTick(() => console.prompt(true))
  }
}

function processInput(console) {
  const { exit } = this.get('node:process')
  const { output, source } = this.get('console:io')
  const { io } = kos
  console.on('line', line => {
    line = line.trim()
    switch(line) {
    case '.info': this.send('render:info', { source, output }); break;
    case '.stat':
      const {
        _transformState: transform,
        _readableState:  readable,
        _writableState:  writable
      } = source.core
      this.info(transform)
      this.info(readable)
      this.info(writable)
      break;
    case '.quit': exit(1)
    default: io.write(line+"\n")
    }
    console.prompt()
  })
}

function renderReactor(reactor) {
  const { show } = this.get('node:program')
  const { stderr } = this.get('node:process')
  if (show) {
    this.send('render:reactor', {
      source: reactor,
      target: stderr
    })
  }
}
