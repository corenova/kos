#!/usr/bin/env node
'use strict'

const program = require('commander')
const pkginfo = require('../package.json')

const Kos = require('..')
const NodeSchema    = require('../schema/node')
// const ConsoleSchema = require('../schema/console')
// const LogSchema     = require('../schema/log')

function collect(val, keys) { keys.push(val); return keys }

program
  .version(pkginfo.version)
  .arguments('<schemas...>')
  .option('-f, --file <file>', 'feed KSON file contents into KOS', collect, [])
  .option('-s, --show', 'print detailed info about persona(s)')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)
  .option('--silent', 'suppress all debug/info/warn/error log messages')
  .parse(process.argv)

Kos
  .use(NodeSchema)
  // .use(ConsoleSchema)
  // .use(LogSchema)
  .feed('nodejs:process', process)
  .feed('nodejs:program', program)
