'use strict'

const { kos = require('..') } = global
const debug  = require('./debug')
const render = require('./render')

// TODO: shouldn't be explicit dependency
const colors = require('colors')

module.exports = kos.reactor('engine')
  .desc('Provides KOS runtime instantiation reactions')
  .chain(debug)
  .init('reactors', new Map)

  .in('process').bind(ioPipeline)

  .in('program').and.has('process')
  .out('debug/level', 'load', 'read', 'prompt')
  .bind(runProgram)

  .in('load').and.has('module/path').out('reactor').bind(loadReactor)
  .in('reactor').bind(chainReactor)

  .in('read').and.has('module/fs').bind(readKSONFile)
  .in('prompt').and.has('process','module/readline').bind(promptUser)

function ioPipeline(process) {
  const engine = this.parent
  const { stdin, stdout, stderr } = process
  const ignores = engine.inputs.concat([ 'module/*', 'debug/level', 'error', 'warn', 'info', 'debug' ])

  // write tokens seen by this reactor into stdout
  engine.on('data', token => {
    if (token.origin !== engine.id &&
        !token.match(ignores)) {
      engine.emit('clear')
      stdout.write(token.toKSON() + "\n")
      engine.emit('clear')
    }
  })
}
  
function runProgram(program) {
  const engine = this.parent
  const reactors = this.get('reactors')
  const { stdin, stdout, stderr } = this.get('process')
  const { args, eval, data, show, silent, verbose=0 } = program

  this.send('debug/level', silent ? -1 : verbose)
  show && engine.pipe(render)

  args.forEach(x => this.send('load', x))
  eval.forEach(x => engine.write(x + "\n"))
  data.forEach(x => this.send('read', x))

  if (show) return

  if (stdin.isTTY) {
    this.send('prompt', {
      input: stdin,
      output: stderr,
      prompt: colors.grey('kos> '),
      completer: (line) => {
        let inputs = engine.inputs.concat(...Array.from(reactors.values()).map(x => x.inputs))
        let completions = Array.from(new Set(inputs)).sort().concat('help','quit')
        const hits = completions.filter(c => c.indexOf(line) === 0)
        if (/\s+$/.test(line)) completions = []
        return [hits.length ? hits : completions, line]
      }
    })
  } else stdin.pipe(engine, { end: false })
}

function loadReactor(name) {
  const path = this.get('module/path')
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
  const engine = this.parent
  const reactors = this.get('reactors')
  engine.chain(reactor)
  reactors.set(reactor.name, reactor)
}

function readKSONFile(filename) {
  const engine = this.parent
  const fs = this.get('module/fs')
  const kson = fs.createReadStream(filename)
  kson.on('error', this.error.bind(this))
  kson.pipe(engine, { end: false })
}

function promptUser(prompt) {
  const engine = this.parent
  const readline = this.get('module/readline')
  const cmd = readline.createInterface(prompt)
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
      engine.write(input + "\n")
    }
    cmd.prompt()
  })
  engine.on('clear', token => {
    readline.clearLine(prompt.output, -1)
    readline.cursorTo(prompt.output, 0)
  })
  // TODO: need to catch before any other output to stderr....
  cmd.prompt()
}
