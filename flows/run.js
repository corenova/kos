'use strict'

const kos = require('..')

module.exports = kos.create('kos-run')
  .summary('Provides runtime instance management flows')
  .import(kos.load('require'))
  .import(kos.load('npm'))
  .import(kos.load('net'))

  .default('flows', new Set)
  
  .in('join').out('net/connect/url').bind(registerConnect)
  .in('host').out('net/listen/url').bind(registerListen)
  .in('kos').bind(collectFlows)


function registerInstance(url) {
  this.send('net/connect/url', url)
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
