'use strict'

const { kos = require('..') } = global
const debug  = require('./debug')
const render = require('./render')

// TODO: shouldn't be explicit dependency?
const colors = require('colors')

module.exports = kos.create('run')
  .desc('reactions to runtime context')
  .load(render)
  .init('modules', new Map)

  .in('process').out('reactor').bind(initialize)

  .in('program','process')
  .out('reactor', 'debug/level', 'load', 'read', 'show', 'prompt')
  .bind(start)

  // TODO: consider making this a separate reactor
  .in('prompt').and.has('process','module/readline').bind(promptUser)

  .in('load').and.has('module/path').out('reactor').bind(loadReactor)
  .in('require').out('module/*', 'require/error').bind(tryRequire)
  .in('read').and.has('module/fs').bind(readKSONFile)

  .in('reactor').out('require').bind(requireReactor)
  .in('reactor').and.has('process','show').out('render').bind(renderReactor)

// self-initialize
function initialize(process) { 
  this.send('reactor', this.parent)
}

function start(program, process) {
  const engine = this.parent
  const { stdin, stdout, stderr } = process
  const { args=[], expr=[], data=[], show=false, silent=false, verbose=0 } = program
  const ignores = engine.inputs.concat([ 'module/*', 'debug/level', 'error', 'warn', 'info', 'debug' ])

  // write tokens seen by this reactor into stdout
  kos.on('flow', (token, flow) => {
    kos.emit('clear')
    if (token.origin !== kos.id) {
      token.match(ignores) || stdout.write(token.toKSON() + "\n")
    }
    if (flow.includes('accept') && flow.includes('reject')) {
      this.warn(`unrecognized token "${token.key}"`)
    }
  })
  silent || kos.pipe(debug)
  debug.feed('debug/level', silent ? -1 : verbose)

  this.info('starting KOS...')

  args.forEach(x => this.send('load', x))
  expr.forEach(x => kos.write(x + "\n"))
  data.forEach(x => this.send('read', x))

  if (show) {
    this.send('show', true)
    return
  }

  if (stdin.isTTY) this.send('prompt', 'kos> ')
  else stdin.pipe(kos, { end: false })
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

function requireReactor(reactor) { 
  const regex = /^module\/(.+)$/
  reactor.requires.forEach(key => {
    let match = key.match(regex, '$1')
    if (!match) return
    this.send('require', match[1])
  })
}

function readKSONFile(filename) {
  const fs = this.get('module/fs')
  const kson = fs.createReadStream(filename)
  kson.on('error', this.error.bind(this))
  kson.pipe(kos, { end: false })
}

function tryRequire(opts) {
  const modules = this.get('modules')
  if (typeof opts === 'string') opts = { name: opts }
  let { name, path } = opts
  try {
    const m = modules.get(name) || require(path || name)
    modules.has(name) || modules.set(name, m)
    this.send('module/'+name, m)
  } catch (e) {
    e.target = name
    this.send('require/error', e)
  }
}

function promptUser(prompt) {
  const regex = /^module\//
  const readline = this.get('module/readline')
  const { stdin, stdout, stderr } = this.get('process')

  if (this.get('active')) return

  const cmd = readline.createInterface({
    input: stdin,
    output: stderr,
    prompt: colors.grey(prompt),
    completer: (line) => {
      let inputs = kos.inputs.filter(x => !regex.test(x))
      let completions = Array.from(new Set(inputs)).sort().concat('.help','.quit')
      const hits = completions.filter(c => c.indexOf(line) === 0)
      if (/\s+$/.test(line)) completions = []
      return [hits.length ? hits : completions, line]
    }
  })
  // XXX - should only accept input that has a reaction
  cmd.on('line', (line) => {
    const input = line.trim()
    switch (input) {
    case '': break;
    case '.help':
      console.error("sorry, you're on your own for now...")
      break;
    case '.quit':
      process.exit(0)
      break;
    default:
      kos.write(input + "\n")
    }
    cmd.prompt()
  })
  kos.on('data', clearPrompt)
  kos.on('clear', clearPrompt)
  this.set('active', true)
  cmd.prompt()

  function clearPrompt() {
    readline.clearLine(stderr, -1)
    readline.cursorTo(stderr, 0)
    process.nextTick(() => cmd.prompt())
  }
}

function renderReactor(reactor) {
  if (!this.get('show')) return
  const { stderr } = this.get('process')
  this.send('render', {
    reactor: reactor,
    output: stderr
  })
}

