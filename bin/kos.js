#!/usr/bin/env node
'use strict'

const program = require('commander')
const pkginfo = require('../package.json')
const kos = require('..')
const run = require('../persona/run')

function collect(val, keys) { keys.push(val); return keys }

program
  .version(pkginfo.version)
  .arguments('<personas...>')
  .option('-e, --expr <kson>', 'eval KSON expression and feed into KOS', collect, [])
  .option('-f, --file <file>', 'feed KSON file contents into KOS', collect, [])
  .option('-s, --show', 'print detailed info about persona(s)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)
  .option('--silent', 'suppress all debug/info/warn/error log messages')
  .parse(process.argv)

kos
  .load(run)
  .feed('process', process)
  .feed('program', program)

