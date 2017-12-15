'use strict'
const { kos = require('..') } = global

module.exports = kos.create('resolve')
  .desc('reactions to resolve local resources')

  .init({
    loadpath: []
  })

  .in('path')
  .bind(saveSearchPath)

  .in('require')
  .out('module/*')
  .bind(tryRequire)

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
