'use strict'

const kos = require('..')

module.exports = kos.create('kos-run')
  .summary('Provides runtime instance management flows')
  .import(kos.load('require'))
  .import(kos.load('npm'))
  .import(kos.load('net'))
  .import(kos.load('http'))

  .default('flows', new Set)

  .in('run').out('http/listen').bind(runInstance)
  
  .in('join').out('net/connect/url').bind(registerConnect)
  .in('host').out('net/listen/url').bind(registerListen)
  .in('kos').bind(collectFlows)

function runInstance(opts) {
  this.send('http/listen')
}


function registerInstance(url) {
  this.send('net/connect/url', url)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
