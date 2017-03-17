'use strict'

const kos = require('..')

module.exports = kos.create('kos-push')
  .summary('Provide dataflow stream push to a remote flow')
  .import(kos.load('link'))

  .in('push/connect').out('link/connect/url').bind(
    function pushConnect(url) { this.send('link/connect/url', url) }
  )
  .in('push/listen').out('link/listen/url').bind(
    function pushListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pushKineticObjects(stream) { this.stream.pipe(stream) }
  )
