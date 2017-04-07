#!/usr/bin/env node
'use strict'

const fs = require('fs')
const colors = require('colors')
const program = require('commander')
const readline = require('readline')

const pkginfo = require('../package.json')
const render = require('./lib/render') // TOOD - for now...

// get core & debug reactors
const core  = require('../reactors/core')
const debug = require('../reactors/debug')

program
  .version(pkginfo.version)
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)

// program
//   .command('create [name]')
//   .description('Start a new dataflow project')
//   .action(() => {})

program
  .command('list')
  .alias('ls')
  .description('List locally available reactors')
  .action(() => {})

program
  .command('show <reactor>')
  .alias('sh')
  .description('Show detailed information about a reactor')
  .action((reactor, opts) => {
    core.on('reactor', x => console.log(render(x)))
    core.feed('load', reactor)
  })

function collect(val, keys) { keys.push(val); return keys }

program
  .arguments('<reactors...>')
  .option('-i, --input <file>', 'load KSON file(s) as initial input(s)', collect, [])
  .option('-t, --trigger <kson>', 'feed arbitrary KSON trigger(s)', collect, [])
  .option('-s, --silent', 'suppress all debug/info/warn/error log messages')
  .action((reactors, opts) => {
    let { input, trigger, silent, verbose } = opts
    opts.silent || core.pipe(debug)

    core.feed('debug/config', { verbose })
    core.feed('load', ...reactors)

    let io = core.io()

    // provide interactive command prompt if tied to TTY
    process.stdin.isTTY && commander(io)

    // 1. send io to stdout
    io.pipe(process.stdout)
    // 2. send triggers
    trigger.forEach(x => io.write(x + "\n"))
    // 3. send contents of input files
    input.forEach(x => fs.createReadStream(input).pipe(io, { end: false }))
    // 4. send piped stdin
    process.stdin.isTTY || process.stdin.pipe(io, { end: false })

  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}

// TODO: should convert to kos.reactor("tty")
function commander(io) {
  const reactors = core.get('reactors')
  const cmd = readline.createInterface({ 
    input:  process.stdin, 
    output: process.stderr,
    prompt: colors.grey('kos> '),
    completer: (line) => {
      let inputs = new Set([].concat(...Array.from(reactors.values()).map(x => x.inputs)))
      let completions = Array.from(inputs).sort().concat('help','quit')
      const hits = completions.filter(c => c.indexOf(line) === 0)
      if (/\s+$/.test(line)) completions = []
      return [hits.length ? hits : completions, line]
    }
  })
  cmd.on('line', (line) => {
    const input = line.trim()
    switch (input) {
    case '': break;
    case 'help':
      console.error("sorry, you're on your own for now...")
      break;
    case 'quit':
      process.exit(0)
      break;
    default:
      let [ key, obj ] = input.split(/\s+(.+)/)
      // if (!kos.consumes.includes(key))
      //   console.error(colors.red('unrecognized input trigger for:', key))
      if (key && obj) io.write(input + "\n")
      else console.error(colors.red('please provide JSON argument for:', key))
    }
    cmd.prompt()
  })
  // catch before IO is about to write to stdout
  io.on('data', ko => {
    readline.clearLine(process.stderr, -1)
    readline.cursorTo(process.stderr, 0)
  })
  // TODO: need to catch before any other output to stderr....
  cmd.prompt()
}
