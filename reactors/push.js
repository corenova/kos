'use strict'

const { kos = require('..') } = global
const linkReactor = require('./link')

module.exports = kos
  .reactor('push', 'Provide dataflow stream push to a remote flow')
  .chain(linkReactor)

  .in('push/connect').out('link/connect/url').bind(
    function pushConnect(url) { this.send('link/connect/url', url) }
  )
  .in('push/listen').out('link/listen/url').bind(
    function pushListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pushKineticObjects(stream) { this.parent.pipe(stream) }
  )
