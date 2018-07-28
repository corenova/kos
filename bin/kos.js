#!/usr/bin/env node
'use strict'

const program = require('commander')
const pkginfo = require('../package.json')

const kos = require('..')
const node = require('../reactor/node')
const console = require('../reactor/console')
const log = require('../reactor/log')

function collect(val, keys) { keys.push(val); return keys }

program
  .version(pkginfo.version)
  .arguments('<reactors...>')
  .option('-f, --file <file>', 'feed KSON file contents into KOS', collect, [])
  .option('-s, --show', 'print detailed info about persona(s)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)
  .option('--silent', 'suppress all debug/info/warn/error log messages')
  .parse(process.argv)

kos
  .load(node)
  .load(console)
  .load(log)
  .feed('process', process)
  .feed('program', program)

