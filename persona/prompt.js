'use strict'
const { kos = require('..') } = global

// TODO: shouldn't be explicit dependency?
const colors = require('colors')

module.exports = kos.create('prompt')
  .desc('reactions to user prompt interactions')
  .init({
    prompt: colors.grey('kos> ')
  })

  .pre('process','module/readline')
  .in('iostream')
  .out('prompt', 'render')
  .bind(promptUser)

function promptUser(io) {
  const regex = /^module\//
  const readline = this.get('module/readline')
  const { stdin, stdout, stderr } = this.get('process')
  const { parent } = io

  if (this.get('active')) return

  const cmd = readline.createInterface({
    input: stdin,
    output: stderr,
    prompt: this.get('prompt'),
    completer: (line) => {
      let inputs = parent.inputs.filter(x => !regex.test(x))
      let completions = Array.from(new Set(inputs)).sort().concat('.info','.help','.quit')
      const hits = completions.filter(c => c.indexOf(line) === 0)
      if (/\s+$/.test(line)) completions = []
      return [hits.length ? hits : completions, line]
    }
  })
  cmd.on('line', (line) => {
    const input = line.trim()
    switch (input) {
    case '': break;
    case '.info':
      this.send('render', { source: kos, target: stderr })
      break;
    case '.help':
      this.error("sorry, you're on your own for now...")
      break;
    case '.quit':
      process.exit(0)
      break;
    default:
      io.write(input + "\n")
    }
    cmd.prompt()
  })
  cmd.on('clear', clearPrompt)

  this.set('active', true)
  process.nextTick(() => cmd.prompt(true))

  io.on('data', clearPrompt).pipe(stdout)
  parent.on('reject', token => this.warn(`ignoring unknown topic: ${token.topic}`))

  this.send('prompt', cmd)

  function clearPrompt() {
    readline.clearLine(stderr, -1)
    readline.cursorTo(stderr, 0)
    process.nextTick(() => cmd.prompt(true))
  }
}

