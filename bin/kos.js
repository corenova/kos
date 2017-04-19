#!/usr/bin/env node
'use strict'

const program = require('commander')
const pkginfo = require('../package.json')

// uses engine and debug reactors
const engine = require('../reactors/engine')
const debug  = require('../reactors/debug')
const render = require('./lib/render') // TODO - for now...

program
  .version(pkginfo.version)
  .option('-i, --input <file>', 'load KSON file(s) as initial input(s)', collect, [])
  .option('-t, --trigger <kson>', 'feed arbitrary KSON trigger(s)', collect, [])
  .option('-s, --silent', 'suppress all debug/info/warn/error log messages')
  .option('-v, --verbose', 'enable more verbose output', ( (v, t) => t + 1), 0)

program
  .command('list')
  .alias('ls')
  .description('List locally available reactors')
  .action(() => {})

program
  .command('show <reactor>')
  .alias('sh')
  .description('Show detailed information about a reactor')
  .action((reactor, opts) => {
    engine.on('reactor', x => console.log(render(x)))
    engine.feed('load', reactor)
  })

program
  .arguments('<reactors...>')
  .action(main)

program.parse(process.argv)

program.args.length || main([], program)

function collect(val, keys) { keys.push(val); return keys }

function main(reactors=[], opts={}) {
  let { input, trigger, silent, verbose } = opts
  let { stdin, stdout, stderr } = process
  silent || engine.pipe(debug)
  engine
    .feed('stdio', { stdin, stdout, stderr })
    .feed('debug/config', { verbose })
    .feed('load', ...reactors)
    .feed('start', { input, trigger })
}
