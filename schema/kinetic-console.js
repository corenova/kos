'use strict'

module.exports = require('./kinetic-console.yang').bind({
  'feature(colors)':   () => require('colors'),
  'feature(readline)': () => require('readline'),

  initialize(process, program) {
    const { parent } = this
    const { stdin, stdout, stderr } = process
    const { show=false } = program
    const { io } = kos

    if (show) return

    if (stdin.isTTY) {
      this.send('console:io', { 
        input: stdin, output: stderr, source: this.root
      })
    } else stdin.pipe(io)

    stdout.isTTY || io.pipe(stdout)

    this.info('started console...')
  },

  createConsole(process, io) {
    const readline = this.use('console:readline')
    const colors = this.use('console:colors')
    const { input, output, source } = io

    const stream = readline.createInterface({
      input, output, 
      prompt: colors.grey(source.label + '> '),
      completer: (line) => {
        let inputs = source.accepts.filter(x => !source.depends.includes(x))
        let completions = inputs.sort().concat('.info','.help','.quit')
        const hits = completions.filter(c => c.indexOf(line) === 0)
        if (/\s+$/.test(line)) completions = []
        return [hits.length ? hits : completions, line]
      }
    })

    stream.on('reset', resetPrompt)
    stream.prompt(true)
    source.on('reject', pulse => this.warn(`ignoring unknown topic: ${pulse.topic}`))

    this.send('console:prompt', { stream })

    function resetPrompt() {
      readline.clearLine(output, -1)
      readline.cursorTo(output, 0)
      process.nextTick(() => stream.prompt(true))
    }
  },

  processInput(process, io, cli) {
    const { exit } = process
    const { output, source } = io
    const { stream } = cli
    
    stream.on('line', line => {
      line = line.trim()
      switch(line) {
      case '.info': this.send('render:info', { source, output }); break;
      case '.stat':
        const {
          _transformState: transform,
          _readableState:  readable,
          _writableState:  writable
        } = source
        this.info(transform)
        this.info(readable)
        this.info(writable)
        break;
      case '.quit': exit(1)
      default: source.write(line+"\n")
      }
      stream.prompt()
    })
  },

  renderReactor(program, process, reactor) {
    const { show } = program
    const { stderr } = process
    if (show) {
      this.send('render:info', {
        source: reactor,
        output: stderr
      })
    }
  }
})
