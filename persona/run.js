
'use strict'
const { kos = require('..') } = global
const debug  = require('./debug')
const render = require('./render')

// TODO: shouldn't be explicit dependency?
const colors = require('colors')

module.exports = kos.create('run')
  .desc('reactions to runtime context')
  .load(render)
  .init({
    modules: new Map,
    loadpath: new Set,
    prompt: colors.grey('kos>')
  })

  .in('process')
  .out('persona')
  .bind(initialize)

  .in('program','process')
  .out('load', 'read', 'show', 'iostream')
  .bind(start)

  // TODO: consider making this a separate persona
  .pre('process','module/readline')
  .in('iostream')
  .out('render')
  .bind(promptUser)

  .pre('module/path')
  .in('load')
  .out('persona')
  .bind(loadPersona)

  .in('load/path')
  .bind(updateLoadPath)

  .in('require')
  .out('module/*')
  .bind(tryRequire)

  .pre('module/fs')
  .in('read')
  .bind(readKSONFile)

  .in('persona')
  .out('require')
  .bind(requirePersona)

  .pre('process','show')
  .in('persona')
  .out('render')
  .bind(renderPersona)

// self-initialize
function initialize(process) { 
  this.send('persona', this.flow)
}

function start(program, process) {
  const { stdin, stdout, stderr } = process
  const { args=[], expr=[], data=[], show=false, silent=false, verbose=0 } = program

  let io = this.flow.io()

  // unless silent, turn on logging
  silent || kos.logs.pipe(debug({ 'debug/level': verbose }))

  args.forEach(x => this.send('load', x))
  process.nextTick(() => {
    expr.forEach(x => io.write(x + "\n"))
    data.forEach(x => this.send('read', x))
  })

  if (show) return this.send('show', true)

  if (stdin.isTTY && stdout.isTTY) this.send('iostream', io)
  else stdin.pipe(io, { end: false }).pipe(stdout)

  this.debug('starting KOS...')
}

function loadPersona(name) {
  const [ path, loadpath ] = this.get('module/path','loadpath')
  const search = [ 
    path.resolve(name),
    path.resolve('persona', name),
    path.resolve(__dirname, name),
    name
  ]
  let persona
  let location
  for (location of search) {
    try { persona = require(location); break }
    catch (e) { 
      if (e.code !== 'MODULE_NOT_FOUND') throw e
    }
  }
  if (!persona) 
    this.throw(`unable to locate persona "${name}" from ${search}`)
    
  if (persona.type !== Symbol.for('kos:persona'))
    this.throw(`unable to load incompatible persona "${name}" from ${location}`)

  this.send('persona', persona.join(kos))
}

function updateLoadPath(loadpath) {
  // TBD
}

function requirePersona(persona) { 
  const regex = /^module\/(.+)$/
  persona.requires.forEach(key => {
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
    this.error(e)
  }
}

function promptUser(io) {
  const regex = /^module\//
  const readline = this.get('module/readline')
  const { stdin, stdout, stderr } = this.get('process')

  if (this.get('active')) return

  const cmd = readline.createInterface({
    input: stdin,
    output: stderr,
    prompt: this.get('prompt'),
    completer: (line) => {
      let inputs = kos.inputs.filter(x => !regex.test(x))
      let completions = Array.from(new Set(inputs)).sort().concat('.info','.help','.quit')
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
    case '.info':
      this.send('render', { source: kos, target: stderr })
      break;
    case '.help':
      console.error("sorry, you're on your own for now...")
      break;
    case '.quit':
      process.exit(0)
      break;
    default:
      io.write(input + "\n")
    }
    cmd.prompt()
  })

  io.on('data', clearPrompt).pipe(stdout)

  this.set('active', true)
  cmd.prompt()

  function clearPrompt() {
    readline.clearLine(stderr, -1)
    readline.cursorTo(stderr, 0)
    process.nextTick(() => cmd.prompt(true))
  }
}

function renderPersona(persona) {
  if (!this.get('show')) return
  const { stderr } = this.get('process')
  this.send('render', {
    source: persona,
    target: stderr
  })
}

