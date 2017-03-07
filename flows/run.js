'use strict'

const kos = require('..')
const runtimeFlows = [
  require('./require'),
  require('./net'),
  require('./push'),
  require('./pull'),
  require('./sync')
]

module.exports = kos.create('kos-run')
  .summary('Provides common runtime flows')
  .include(...runtimeFlows)
  .on('ready', run => {
    run
      .feed('require', 'net')
      .feed('require', 'url')
  })
