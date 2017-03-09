'use strict'

const kos = require('..')

module.exports = kos.create('kos-run')
  .summary('Provides common runtime flows as a chained pipeline')
  .chain(
    require('./require'),
    require('./function'),
    require('./net'),
    require('./push'),
    require('./pull'),
    require('./sync')
  )
