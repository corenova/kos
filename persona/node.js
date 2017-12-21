'use strict'
const { kos = require('..') } = global

const console = require('./console')
const log = require('./log')

module.exports = kos.create('node')
  .desc('reactions to Node.js runtime context')
  .pass(true)

  .load(console)
  .load(log)

  .in('process').out('resolve')
  .bind(initialize)

  .pre('process')
  .in('program')
  .out('load', 'eval', 'read', 'log')
  .bind(execute)

  .pre('module/path')
  .in('load')
  .out('persona','resolve')
  .bind(loadPersona)

  .in('resolve')
  .out('require')
  .bind(resolveDependency)

  .in('require')
  .out('module/*')
  .bind(tryRequire)

  .pre('module/fs')
  .in('read')
  .bind(readKSONFile)

// self-initialize 
function initialize(process) { 
  this.send('resolve', ...this.persona.depends)
  this.save({ process })
}

function execute(program) {
  const { args=[], file=[], show=false, silent=false, verbose=0 } = program
  const { stdin, stdout, stderr } = this.get('process')
  const { io } = this

  // unless silent, setup logging
  silent || this.send('log', { level: verbose })

  // flush processing of 'load' tokens first
  this.send('load', ...args).flush()
  if (show) return

  this.send('read', ...file)

  if (stdin.isTTY) {
    this.send('prompt', { 
      input: stdin, output: stderr, source: this.persona
    })
  } else stdin.pipe(io)

  stdout.isTTY || io.pipe(stdout)

  this.info('started KOS Node.js persona...')
}

function saveSearchPath(loadpath) {
  // TBD
  this.save({ loadpath })
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

  persona.join(this.persona)
  this.send('persona', persona)
  this.send('resolve', ...persona.depends)
}

function resolveDependency(dep) {
  const regex = /^module\/(.+)$/
  let match = regex.exec(dep,'$1')
  if (match) this.send('require', match[1])
}

function tryRequire(opts) {
  if (typeof opts === 'string') opts = { name: opts }
  let { name, path } = opts
  try {
    const m = this.get(name) || require(path || name)
    this.has(name) || this.set(name, m)
    this.send('module/'+name, m)
  } catch (e) {
    e.target = name
    this.error(e)
  }
}

function readKSONFile(filename) {
  const fs = this.get('module/fs')
  const kson = fs.createReadStream(filename)
  kson.on('error', this.error.bind(this))
  kson.pipe(this.io, { end: false })
}

