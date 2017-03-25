'use strict'

const { kos = require('..') } = global

module.exports = kos.create('sync')
  .summary('Provide dataflow stream pull/push to a remote flow')
  .import(require('./link'))

  .in('sync/connect').out('link/connect/url').bind(
    function syncConnect(url) { this.send('link/connect/url', url) }
  )
  .in('sync/listen').out('link/listen/url').bind(
    function syncListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function syncKineticObjects(stream) { stream.pipe(this.stream).pipe(stream) }
  )
