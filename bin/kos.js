#!/usr/bin/env node
'use strict'

const kos = require('..')
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
  .option('-p, --passthrough', 'allow STDIN to passthrough to STDOUT (use for shell pipelines)', false)
  .option('-s, --silent', 'suppress all debug/info/error messages')
  .action((flows, opts) => {
    flows = flows.filter(Boolean).map(kos.load)
    let [ head, tail ] = kos.chain(...flows)
    head || process.exit(1)
    tail && tail.pipe(head) // close loop if more than one flow

    let io = head.io(opts)
    opts.silent || head.on('data', ko => {
      // check if externally provided ko was accepted by the internal flow
      if (io.seen(ko) && !ko.accepted)
        console.error('error:'.red, 'no matching flow for:', ko.key)

      switch (ko.key) {
      case 'kos':   console.error('info:'.cyan, ko.value.identity, 'ready'); break;
      case 'info':  console.error('info:'.cyan, ko.value); break
      case 'error': console.error('error:'.red, ko.value.message); break;
      case 'debug': opts.verbose && console.error('debug:'.grey, ko.value); break
      }
    })
    console.error('kos begins...'.grey)
    process.stdin.pipe(io).pipe(process.stdout)
  })

program.parse(process.argv)

function collect(val, keys) {
  keys.push(val)
  return keys
}
