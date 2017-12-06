'use strict'
const { kos = require('..') } = global

const log  = require('./log')
const render = require('./render')
const prompt = require('./prompt')

module.exports = kos.create('run')
  .desc('reactions to runtime context')
  .load(log)
  .load(render)
  .load(prompt)

  .init({
    modules: new Map,
    loadpath: new Set
  })

  .in('process')
  .out('persona')
  .bind(initialize)

  .in('program','process')
  .out('load', 'read', 'show', 'log', 'prompt/io')
  .bind(start)

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

  .in('error')
  .bind(trackErrors)

// self-initialize
function initialize(process) { 
  this.send('persona', this.flow)
}

function start(program, process) {
  const { stdin, stdout, stderr } = process
  const { args=[], expr=[], data=[], show=false, silent=false, verbose=0 } = program

  let io = this.flow.io({
    'error': false // ignore error topics
  })

  // unless silent, turn on logging
  silent || this.send('log', { level: verbose })

  args.forEach(x => this.send('load', x))
  process.nextTick(() => {
    expr.forEach(x => io.write(x + "\n"))
    data.forEach(x => this.send('read', x))
  })

  if (show) return this.send('show', true)

  if (stdin.isTTY && stdout.isTTY) this.send('prompt/io', io)
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
      if (e.code !== 'MODULE_NOT_FOUND') 
        this.throw(e)
    }
  }
  if (!persona) 
    this.throw(`unable to locate persona "${name}" from ${search}`)
    
  if (persona.type !== Symbol.for('kos:persona'))
    this.throw(`unable to load incompatible persona "${name}" from ${location}`)

  this.send('persona', persona)
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
  kson.pipe(this.flow, { end: false })
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

function renderPersona(persona) {
  if (!this.get('show')) return
  const { stderr } = this.get('process')
  this.send('render', {
    source: persona,
    target: stderr
  })
}

function trackErrors(error) {
  
}
