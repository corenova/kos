'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.reactor('push')
  .desc('reactions to push dataflow object to remote stream(s)')
  .load(link)

  .in('push/connect').out('link/connect/url').bind(
    function pushConnect(url) { this.send('link/connect/url', url) }
  )
  .in('push/listen').out('link/listen/url').bind(
    function pushListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pushKineticObjects(stream) { this.parent.pipe(stream) }
  )
