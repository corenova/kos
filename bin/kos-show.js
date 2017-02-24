#!/usr/bin/env node
'use strict'

const program = require('commander')
program
  .option('--json ', 'output JSON format')
  .option('--yaml ', 'output YAML format')
  .parse(process.argv)

const command = require('../flows/command')
command.invoke('show', program).then(console.info)
