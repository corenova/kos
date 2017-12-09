'use strict'
const { kos = require('..') } = global

module.exports = kos.create('resolve')
  .desc('reactions to local resource access')

  .init({
    loadpath: []
  })

  .pre('module/path')
  .in('load')
  .out('persona')
  .bind(loadPersona)

  .in('path')
  .bind(saveSearchPath)

  .in('require')
  .out('module/*')
  .bind(tryRequire)

  .pre('module/fs')
  .in('read')
  .bind(readKSONFile)

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

function saveSearchPath(path) {
  // TBD
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
  kson.pipe(this.flow, { end: false })
}

