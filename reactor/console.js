'use strict'
const { kos = require('..') } = global

const render = require('./render')

// TODO: shouldn't be explicit dependency?
const colors = require('colors')

module.exports = kos.create('console')
  .desc('reactions to command-line interactions')

  .load(render)

  .pre('parent')
  .in('process')
  .in('program')
  .out('load', 'read', 'log', 'prompt')
  .bind(execute)

  .pre('process')
  .pre('module/readline')
  .in('prompt')
  .out('console','console/line')
  .bind(createConsole)

  .pre('process')
  .pre('prompt')
  .in('console')
  .out('*')
  .bind(processInput)

  .pre('process','program')
  .in('reactor')
  .out('render')
  .bind(renderReactor)

function execute(process, program) {
  const parent = this.get('parent')
  const { stdin, stdout, stderr } = process
  const { args=[], file=[], show=false, silent=false, verbose=0 } = program
  const { io } = kos

  // unless silent, setup logging
  silent || this.send('log', { level: verbose })

  // immediate processing of 'load' tokens first
  this.sendImmediate('load', ...args)
  if (show) return

  this.send('read', ...file)

  if (stdin.isTTY) {
    this.send('prompt', { 
      input: stdin, output: stderr, source: parent
    })
  } else stdin.pipe(io)

  stdout.isTTY || io.pipe(stdout)

  this.info('started console...')
}

function createConsole(prompt) {
  const regex = /^module\//
  const [ process, readline ] = this.get('process', 'module/readline')
  const { input, output, source } = prompt

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

  this.send('console', console)

  function resetPrompt() {
    readline.clearLine(output, -1)
    readline.cursorTo(output, 0)
    process.nextTick(() => console.prompt(true))
  }
}

function processInput(console) {
  const { exit } = this.get('process')
  const { output, source } = this.get('prompt')
  const { io } = kos
  console.on('line', line => {
    line = line.trim()
    switch(line) {
      case '.info': this.send('render', { source, target: output }); break;
      case '.quit': exit(1)
      default: io.write(line+"\n")
    }
    console.prompt()
  })
}

function renderReactor(reactor) {
  const { show } = this.get('program')
  const { stderr } = this.get('process')
  if (show) {
    this.send('render', {
      source: reactor,
      target: stderr
    })
  }
}
