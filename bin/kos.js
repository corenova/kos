#!/usr/bin/env node
'use strict'

const kos = require('..')
const program = require('commander')

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
  .description('Runs one or more flow(s) with built-in core flows: require, net, push, pull, sync')
  .option('-h, --host', 'host to run the flows', kos.DEFAULT_HOST)
  .option('-p, --port', 'port to run the flows', kos.DEFAULT_PORT)
  .action((flows, opts) => {
    flows = [].concat('require', 'net', 'push', 'pull', 'sync', flows)
    flows = flows.filter(Boolean).map(kos.load)
    let [ head, tail ] = kos.chain(...flows)
    head || process.exit(1)
    tail && tail.pipe(head) // close loop
    // default state initialization
    head.feed('require', 'net')
    head.feed('require', 'url')
    process.stdin.pipe(head.io(opts)).pipe(process.stdout)
  })

program
  .arguments('[flows...]')
  .option('-i, --input <format>', 'data format of STDIN', /^(json|yaml)$/i, 'json')
  .option('-o, --output <format>', 'data format of STDOUT', /^(json|yaml)$/i, 'json')
  .option('-p, --passthrough', 'allow STDIN to passthrough to STDOUT')
  .action((flows, opts) => {
    flows = flows.filter(Boolean).map(kos.load)
    let [ head, tail ] = kos.chain(...flows)
    head || process.exit(1)
    tail && tail.pipe(head) // close loop
    process.stdin.pipe(head.io(opts)).pipe(process.stdout)
  })

program.parse(process.argv)
