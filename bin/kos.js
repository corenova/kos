#!/usr/bin/env node
'use strict'

const program = require('commander')
const pkginfo = require('../package.json')
const engine = require('../reactors/engine')

function collect(val, keys) { keys.push(val); return keys }

program
  .version(pkginfo.version)
  .arguments('<reactors...>')
  .option('-e, --eval <kson>', 'eval KSON statement and feed into KOS', collect, [])
  .option('-d, --data <file>', 'feed KSON file contents into KOS', collect, [])
  .option('-s, --show', 'print detailed info about reactor(s)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)
  .option('--silent', 'suppress all debug/info/warn/error log messages')
  .parse(process.argv)

engine
  .feed('process', process)
  .feed('program', program)

