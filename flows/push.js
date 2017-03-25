'use strict'

const { kos = require('..') } = global

module.exports = kos.create('push')
  .summary('Provide dataflow stream push to a remote flow')
  .import(require('./link'))

  .in('push/connect').out('link/connect/url').bind(
    function pushConnect(url) { this.send('link/connect/url', url) }
  )
  .in('push/listen').out('link/listen/url').bind(
    function pushListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pushKineticObjects(stream) { this.stream.pipe(stream) }
  )
