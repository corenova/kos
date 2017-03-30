'use strict'

const { kos = require('..') } = global
const linkReactor = require('./link')

module.exports = kos
  .reactor('pull', 'Provide dataflow object pull from remote stream(s)')
  .embed(linkReactor)

  .in('pull/connect').out('link/connect/url').bind(
    function pullConnect(url) { this.send('link/connect/url', url) }
  )
  .in('pull/listen').out('link/listen/url').bind(
    function pullListen(url)  { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pullKineticObjects(stream) { stream.pipe(this.parent) }
  )

