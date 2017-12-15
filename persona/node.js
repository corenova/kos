'use strict'
const { kos = require('..') } = global

const console = require('./console')

module.exports = kos.create('node')
  .desc('reactions to Node.js runtime context')
  .load(console)

  .in('process')
  .out('resolve')
  .bind(initialize)

  .in('program','process')
  .out('load', 'read', 'show', 'log', 'stdio')
  .bind(start)

  .in('path')
  .bind(saveSearchPath)

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
  this.send('resolve', ...this.parent.depends)
}

function start(program, process) {
  const { stdin, stdout, stderr } = process
  const { args=[], expr=[], file=[], show=false, silent=false, verbose=0 } = program

  let io = kos.io({
    persona: false,
    resolve: false,
    error: false // ignore error topics
  })

  // unless silent, turn on logging
  silent || args.unshift('log')
  args.forEach(x => this.send('load', x))
  process.nextTick(() => {
    this.send('log', { level: verbose })
    expr.forEach(x => io.write(x + "\n"))
    file.forEach(x => this.send('read', x))
  })

  if (show) return this.send('show', true)

  if (stdin.isTTY && stdout.isTTY) this.send('stdio', io)
  else stdin.pipe(io, { end: false }).pipe(stdout)

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

  this.send('persona', persona)
  this.send('resolve', ...persona.depends)
}

function resolveDependency(dep) {
  const regex = /^module\/(.+)$/
  let match = regex.exec(dep,'$1')
  if (match) this.send('require', match[1])
}

function readKSONFile(filename) {
  const fs = this.get('module/fs')
  const kson = fs.createReadStream(filename)
  kson.on('error', this.error.bind(this))
  kson.pipe(this.reactor, { end: false })
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
