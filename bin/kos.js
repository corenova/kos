#!/usr/bin/env node
'use strict'
let program = require('commander')

program
  .version('1.0.0')
  .option('-c, --config <file>', 'use specified <file> to retrieve configuration data (default: uses "config" directory)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)

program
  .command('create [name]', 'Start a new dataflow project')

program
  .command('list').alias('ls')
  .description('List locally available flows')
  .action( () => {} )

program
  .command('show [flow]', 'Show detailed information about a flow').alias('sh')
  // .command('status',          'Display working core status').alias('stat')
  // .command('bind [target]',   'Adds one or more targets as dependency').alias('b')
  // .command('unbind [target]', 'Removes one or more targets as dependency').alias('u')
  .command('pull [flow]', 'Fetch from and integrate with origin')
  .command('push [flow]', 'Publish flow to origin')
  // .command('push',            'Deploy to upstream nova')
  // .command('run',           'Runs the experiment locally')

program.parse(process.argv)
