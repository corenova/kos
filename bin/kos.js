#!/usr/bin/env node
'use strict'

const program = require('commander')

program
  .version('1.0.0')
  .option('-c, --config <file>', 'use specified <file> to retrieve configuration data (default: uses "config" directory)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)

program
  .command('create [name]', 'Start a new dataflow project')

program
  .command('list').alias('ls')
  .description('List locally available streams')
  .action( () => {} )

program
  .command('show [streams]', 'Show detailed information about a stream').alias('sh')
  // .command('status',          'Display working core status').alias('stat')
  //.command('bind [streams]', 'Binds one or more targets as dependency')
  // .command('unbind [target]', 'Removes one or more targets as dependency').alias('u')
  .command('pull [streams]', 'Fetch from and integrate with origin')
  .command('push [streams]', 'Publish flow to origin')
  .command('run [streams]',  'Runs one or more stream(s)')

program.parse(process.argv)
