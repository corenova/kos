'use strict'
const { kos = require('..') } = global

module.exports = kos.create('node')
  .desc('reactions to Node.js runtime environment interactions')
  .pass(true)

  .in('process').out('resolve')
  .bind(initialize)

  .in('program')
  .out('load', 'read', 'log')
  .bind(execute)

  .pre('module/path')
  .in('load')
  .out('reactor','resolve')
  .bind(loadReactor)

  .in('resolve')
  .out('require')
  .bind(resolveDependency)

  .in('require')
  .out('module/*')
  .bind(tryRequire)

  .pre('module/fs')
  .in('read')
  .bind(readKSONFile)

// self-initialize when part of kos layers (usually kos directly)
function initialize(process) { 
  //const { parent } = this
  this.send('resolve', ...kos.depends)
  //this.save({ process })
}

function execute(program) {
  const { args=[], file=[], silent=false, verbose=0 } = program

  // unless silent, setup logging
  silent || this.send('log', { level: verbose })

  // immediate processing of 'load' tokens first
  this.sendImmediate('load', ...args)
  this.send('read', ...file)
}

function loadReactor(name) {
  const [ path, loadpath ] = this.get('module/path','loadpath')
  const search = [ 
    path.resolve(name),
    path.resolve('reactor', name),
    path.resolve(__dirname, name),
    name
  ]
  let reactor
  let location
  for (location of search) {
    try { reactor = require(location); break }
    catch (e) { 
      if (e.code !== 'MODULE_NOT_FOUND') 
        this.throw(e)
    }
  }
  if (!reactor) 
    this.throw(`unable to locate reactor "${name}" from ${search}`)
    
  if (reactor.type !== Symbol.for('kos:reactor'))
    this.throw(`unable to load incompatible reactor "${name}" from ${location}`)

  reactor.join(this.parent)
  this.send('reactor', reactor)
  this.send('resolve', ...reactor.depends)
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

