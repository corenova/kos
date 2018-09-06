'use strict'

const { kos = require('..') } = global

const schema = require('../schema/kinetic-node-js')

module.exports = kos.create(schema)

  .reaction
  .in('node:process').out('node:resolve')
  .bind(initialize)

  .reaction
  .in('node:program')
  .out('node:load', 'node:read', 'kos:log')
  .bind(execute)

  .reaction
  .pre('module/path')
  .in('node:load')
  .out('kos:reactor','node:resolve')
  .bind(loadReactor)

  .reaction
  .in('node:resolve')
  .out('node:require')
  .bind(resolveDependency)

  .reaction
  .in('node:require')
  .out('module/*')
  .bind(tryRequire)

  .reaction
  .pre('module/fs')
  .in('node:read')
  .bind(readKSONFile)

// self-initialize when part of kos layers (usually kos directly)
function initialize(process) { 
  //const { parent } = this
  this.send('node:resolve', ...kos.depends)
  //this.save({ process })
}

function execute(program) {
  const { args=[], file=[], silent=false, verbose=0 } = program

  // unless silent, setup logging
  silent || this.send('kos:log', { level: verbose })

  // immediate processing of 'load' tokens first
  this.sendImmediate('node:load', ...args)
  this.send('node:read', ...file)
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
  this.send('kos:reactor', reactor)
  this.send('node:resolve', ...reactor.depends)
}

function resolveDependency(dep) {
  const regex = /^module\/(.+)$/
  let match = regex.exec(dep,'$1')
  if (match) this.send('node:require', match[1])
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

