#!/usr/bin/env node
'use strict'

const kos = require('..')
const fs = require('fs')
const debug = require('debug')
const colors = require('colors')
const program = require('commander')
const render = require('./lib/render') // TOOD - for now...

program
  .version('1.0.0')
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
  .allowUnknownOption(true)
  .action((flows, opts) => {
    flows = flows.filter(Boolean).map(kos.load)
    let [ head, tail ] = kos.chain(...flows)
    head || process.exit(1)

    let io = head.io(opts)
    opts.silent || tail.pipe(logger(io, opts.verbose))

    for (let trigger of opts.trigger)
      io.write(trigger + "\n")
    for (let input of opts.input)
      fs.createReadStream(input).pipe(io, { end: false })
    process.stdin.pipe(io).pipe(process.stdout)
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
      case 'warn':  warn(ko.value); break
      case 'info':  info(ko.value); break
      case 'debug': log(ko.value); break
      default:
        if (ko.key === 'kos')
          trace(render(ko.value))
        else if (typeof ko.value === 'object')
          trace('%s\n%O', ko.key.cyan, ko.value)
        else
          trace('%s %o', ko.key.cyan, ko.value)
      }
      cb()
    }
  })
}
