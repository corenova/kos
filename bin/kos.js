#!/usr/bin/env node
'use strict'

const fs = require('fs')
const debug = require('debug')
const colors = require('colors')
const program = require('commander')
const readline = require('readline')

const kos = require('..')
const pkginfo = require('../package.json')
const render = require('./lib/render') // TOOD - for now...

program
  .version(pkginfo.version)
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)

program
  .command('create [name]')
  .description('Start a new dataflow project')
  .action(() => {})

program
  .command('list')
  .alias('ls')
  .description('List locally available flows')
  .action(() => {})

program
  .command('show <flow>')
  .alias('sh')
  .description('Show detailed information about a flow')
  .action((flow, opts) => {
    console.log(render(kos.load(flow)))
  })

// convenience execution of an interactive "run" flow with command-line options
// program
//   .command('run [flows...]')
//   .description('Starts an interactive web server with optional flows')
//   .option('-p, --port <number>', 'local port to listen for web requests', 3000)
//   .action((flows, opts) => {
//     kos.load('run')
//       .feed('run', opts)
//       .feed('run/load', flows)
//   })

program
  .arguments('<flows...>')
  .option('-i, --input <file>', 'load KSON file(s) as initial input(s)', collect, [])
  .option('-t, --trigger <kson>', 'feed arbitrary KSON trigger(s)', collect, [])
  .option('-s, --silent', 'suppress all debug/info/warn/error log messages')
  .action((flows, opts) => {
    let { input, trigger, silent, verbose } = opts
    kos.feed('log', { silent, verbose })
    kos.feed('load', ...flows)

    let io = kos.io(opts)

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

// KOS utility helper functions

function collect(val, keys) {
  keys.push(val)
  return keys
}

// should be a flow?
function commander(io) {
  const cmd = readline.createInterface({ 
    input:  process.stdin, 
    output: process.stderr,
    prompt: colors.grey('kos> '),
    completer: (line) => {
      let completions = kos.consumes.sort().concat('help','quit')
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
      console.error("sorry, unable offer any help at the moment")
      break;
    case 'quit':
      process.exit(0)
      break;
    default:
      let [ key, obj ] = input.split(/\s+(.+)/)
      if (!kos.consumes.includes(key))
        console.error(colors.red('unrecognized input trigger for:', key))
      else if (key && obj) io.write(input + "\n")
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
