'use strict'

const { kos = require('..') } = global

module.exports = kos.create('kos-pull')
  .summary('Provide dataflow stream pull from remote flow(s)')
  .import(require('./link'))

  .in('pull/connect').out('link/connect/url').bind(
    function pullConnect(url) { this.send('link/connect/url', url) }
  )
  .in('pull/listen').out('link/listen/url').bind(
    function pullListen(url)  { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pullKineticObjects(stream) { stream.pipe(this.stream) }
  }

