#!/usr/bin/env node
'use strict'

const program = require('commander')
program
  .option('-h, --host', 'host to run on', '127.0.0.1')
  .option('-p, --port', 'port to run on', 1505)
  .parse(process.argv)

const command = require('../flows/command')
command.invoke('run', program).then(console.info)
