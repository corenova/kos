'use strict'
const { kos = require('..') } = global

const render = require('./render')

// TODO: shouldn't be explicit dependency?
const colors = require('colors')

module.exports = kos.create('console')
  .desc('reactions to user prompt interactions')

  .load(render)

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
  .in('persona')
  .out('render')
  .bind(renderPersona)

function createConsole(prompt) {
  const regex = /^module\//
  const [ process, readline ] = this.get('process', 'module/readline')
  const { input, output, source } = prompt

  const console = readline.createInterface({
    input, output, 
    prompt: colors.grey(source.identity + '> '),
    completer: (line) => {
      let inputs = source.absorbs.filter(x => !regex.test(x))
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
  const { io } = this
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

function renderPersona(persona) {
  const { show } = this.get('program')
  const { stderr } = this.get('process')
  if (show) {
    this.send('render', {
      source: persona,
      target: stderr
    })
  }
}
