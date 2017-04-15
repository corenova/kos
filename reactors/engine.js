'use strict'

const { kos = require('..') } = global
const requireReactor = require('./require')

// explicit external dependency on 'colors' and 'readline' modules
const colors = require('colors')
const readline = require('readline')

module.exports = kos.reactor('engine')
  .desc('Provides KOS engine process/load/start reactions')
  .init('reactors', new Map)
  .chain(requireReactor)

  .in('load').and.has('module/path').out('reactor').bind(loadReactor)
  .in('reactor').bind(chainReactor)

  .in('stdio').bind(pipelineIO)
  .in('start').and.has('stdio','module/fs').bind(startEngine)

function loadReactor(name) {
  let path = this.get('module/path')
  let reactor = {}
  let search = [ 
    path.resolve(name),
    path.resolve(path.join('reactors', name)),
    path.resolve(__dirname, name),
    name
  ]
  for (let name of search) {
    try { reactor = require(name); break }
    catch (e) { 
      if (e.code !== 'MODULE_NOT_FOUND') throw e
    }
  }
  if (reactor.type !== Symbol.for('kinetic.reactor'))
    throw new Error("unable to load KOS for " + name + " from " + search)

  this.send('reactor', reactor)
}

function chainReactor(reactor) { 
  let reactors = this.get('reactors')
  this.parent.chain(reactor)
  reactors.set(reactor.name, reactor)
}

function pipelineIO(stdio) {
  const { stdin, stdout, stderr } = stdio
  const engine = this.parent

  // handle kinetic objects seen by this reactor
  engine.on('data', ko => {
    if (ko.origin !== engine.id &&
        !ko.match([ 'module/*', 'reactor', 'error', 'warn', 'info', 'debug' ])) {
      stdout.write(ko.toKSON() + "\n")
    }
  })
}

function startEngine(opts) {
  const fs = this.get('module/fs')
  const { stdin, stdout, stderr } = this.get('stdio')
  const { input, trigger } = opts
  const engine = this.parent

  // 1. process KSON triggers
  trigger.forEach(x => engine.write(x + "\n"))
  // 2. process KSON from input files
  input.forEach(x => fs.createReadStream(input).pipe(engine, { end: false }))
  // 3. handle STDIN
  if (!stdin.isTTY) stdin.pipe(engine, { end: false })
  else {
    const reactors = this.get('reactors')
    const cmd = readline.createInterface({ 
      input:  stdin, 
      output: stderr,
      prompt: colors.grey('kos> '),
      completer: (line) => {
        let inputs = new Set([].concat(...Array.from(reactors.values()).map(x => x.inputs)))
        let completions = Array.from(inputs).sort().concat('help','quit')
        const hits = completions.filter(c => c.indexOf(line) === 0)
        if (/\s+$/.test(line)) completions = []
        return [hits.length ? hits : completions, line]
      }
    })
    cmd.on('line', (line) => {
      const input = line.trim()
      switch (input) {
      case '': break;
      case 'help':
        console.error("sorry, you're on your own for now...")
        break;
      case 'quit':
        process.exit(0)
        break;
      default:
        let [ key, obj ] = input.split(/\s+(.+)/)
        // if (!kos.consumes.includes(key))
        //   console.error(colors.red('unrecognized input trigger for:', key))
        if (key && obj) engine.write(input + "\n")
        else console.error(colors.red('please provide JSON argument for:', key))
      }
      cmd.prompt()
    })
    engine.on('data', ko => {
      readline.clearLine(stderr, -1)
      readline.cursorTo(stderr, 0)
    })
    // TODO: need to catch before any other output to stderr....
    cmd.prompt()
  }
}
