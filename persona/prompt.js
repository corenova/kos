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
  .in('prompt/io')
  .out('prompt/cmd', 'render')
  .bind(promptUser)

function promptUser(io) {
  const regex = /^module\//
  const readline = this.get('module/readline')
  const { stdin, stdout, stderr } = this.get('process')

  if (this.get('active')) return

  const cmd = readline.createInterface({
    input: stdin,
    output: stderr,
    prompt: this.get('prompt'),
    completer: (line) => {
      let inputs = kos.inputs.filter(x => !regex.test(x))
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
      console.error("sorry, you're on your own for now...")
      break;
    case '.quit':
      process.exit(0)
      break;
    default:
      io.write(input + "\n")
    }
    cmd.prompt()
  })

  io.on('data', clearPrompt).pipe(stdout)
  kos.on('clear', clearPrompt)

  this.set('active', true)
  process.nextTick(() => cmd.prompt(true))

  this.send('prompt/cmd', cmd)

  function clearPrompt() {
    readline.clearLine(stderr, -1)
    readline.cursorTo(stderr, 0)
    process.nextTick(() => cmd.prompt(true))
  }
}

