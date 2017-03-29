'use strict'

const { kos = require('..') } = global
const linkReactor = require('./link')

module.exports = kos
  .reactor('sync', 'Provide dataflow object synchronization with remote stream(s)')
  .chain(linkReactor)

  .in('sync/connect').out('link/connect/url').bind(
    function syncConnect(url) { this.send('link/connect/url', url) }
  )
  .in('sync/listen').out('link/listen/url').bind(
    function syncListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function syncKineticObjects(stream) { stream.pipe(this.parent).pipe(stream) }
  )
