#!/usr/bin/env node
'use strict'

const fs = require('fs')
const debug = require('debug')
const colors = require('colors/safe')
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

program
  .arguments('<flows...>')
  .option('-i, --input <file>', 'load KSON file(s) as initial input(s)', collect, [])
  .option('-t, --trigger <kson>', 'feed arbitrary KSON trigger(s)', collect, [])
  .option('-p, --passthrough', 'allow STDIN to passthrough to STDOUT (use for shell pipelines)', false)
  .option('-s, --silent', 'suppress all debug/info/error messages')
  .action((flows, opts) => {
    flows = flows.filter(Boolean).map(kos.load)
    let [ head, tail ] = kos.chain(...flows)
    head || process.exit(1)

    let io = head.io(opts)
    opts.silent || tail.pipe(logger(io, opts.verbose))

    if (process.stdin.isTTY) {
      const cmd = readline.createInterface({ 
        input:  process.stdin, 
        output: process.stderr,
        prompt: colors.grey('kos> ')
      })
      cmd.on('line', (input) => {
        io.write(input + "\n")
        cmd.prompt()
      })
      cmd.prompt()
      // catch before IO is about to write to stdout
      io.on('data', ko => {
        readline.clearLine(process.stderr, -1)
        readline.cursorTo(process.stderr, 0)
      })
    }

    process.stdout.isTTY && io.pipe(process.stdout)
    process.stdin.isTTY  || process.stdin.pipe(io)

    //head.feed('init', process.argv)

    for (let trigger of opts.trigger)
      io.write(trigger + "\n")
    for (let input of opts.input)
      fs.createReadStream(input).pipe(io, { end: false })
  })

program.parse(process.argv)

function collect(val, keys) {
  keys.push(val)
  return keys
}

function logger(io, verbosity=0) {
  let namespaces = [ 'kos:error', 'kos:warn' ]
  if (verbosity)     namespaces.push('kos:info')
  if (verbosity > 1) namespaces.push('kos:debug')
  if (verbosity > 2) namespaces.push('kos:trace')
  debug.enable(namespaces.join(','))

  let trace = debug('kos:trace')
  let log   = debug('kos:debug')
  let info  = debug('kos:info')
  let warn  = debug('kos:warn')
  let error = debug('kos:error')

  return new kos.Essence({
    transform(ko, enc, cb) {
      if (!ko) return cb()
      if (io.seen(ko) && !ko.accepted)
        warn('no local flow reactor to handle "%s"', ko.key)
      switch (ko.key) {
      case 'error': 
        if (verbosity > 1) error(ko.value)
        else error(ko.value.message)
        break
      case 'warn':  warn(...ko.value); break
      case 'info':  info(...ko.value); break
      case 'debug': log(...ko.value); break
      default:
        if (ko.key === 'kos')
          trace(render(ko.value)+"\n")
        else if (typeof ko.value === 'object')
          trace('%s\n%O\n', colors.cyan(ko.key), ko.value)
        else
          trace('%s %o', colors.cyan(ko.key), ko.value)
      }
      cb()
    }
  })
}
