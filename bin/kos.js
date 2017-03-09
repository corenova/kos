#!/usr/bin/env node
'use strict'

const kos = require('..')
const fs = require('fs')
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
    opts.silent || tail.on('data', ko => {
      // check if externally provided ko was accepted by the internal flow
      if (io.seen(ko) && !ko.accepted && opts.verbose)
        console.error('info:'.cyan, 'no local flow reactor for:', ko.key)

      switch (ko.key) {
      case 'info':  opts.verbose && console.error('info:'.cyan, ko.value); break
      case 'error': console.error('error:'.red, ko.value.message); break;
      case 'debug': opts.verbose > 1 && console.error('debug:'.grey, ko.value); break
      }
    })
    head.feed('init', process.argv)
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
