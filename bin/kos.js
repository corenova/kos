#!/usr/bin/env node
'use strict'

const kos = require('..')
const program = require('commander')
//const command = require('../flows/command')

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
  .option('-o, --output ', 'output format', /^(json|yaml|tree)$/i, 'tree')
  .action((flow, opts) => {

  })

program
  .command('run [flows...]')
  .description('Runs one or more flow(s)')
  .option('-h, --host', 'host to run the flows', '127.0.0.1')
  .option('-p, --port', 'port to run the flows', 1505)
  .action((flows, opts) => {
    command
      .feed('run', opts)
      .then(flow => {
        
      })
  })

program
  .arguments('[flows...]')
  .option('-i, --input ', 'input format', /^(json|yaml)$/i, 'json')
  .option('-o, --output ', 'output format', /^(json|yaml)$/i, 'json')
  .action((flows, opts) => {
    let { input, output } = opts
    flows = flows.filter(Boolean).map(flow => kos.load(flow))
    let [ head, tail ] = kos.chain(...flows)
    if (!head) process.exit(1)
    if (tail) tail.pipe(head) // close loop
    process.stdin.pipe(head.io(input, output)).pipe(process.stdout)
  })

program.parse(process.argv)
