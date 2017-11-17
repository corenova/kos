'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.create('pull')
  .desc('reactions to pull dataflow objects from remote stream(s)')
  .load(link)

  .in('pull/connect').out('link/connect/url').bind(
    function pullConnect(url) { this.send('link/connect/url', url) }
  )
  .in('pull/listen').out('link/listen/url').bind(
    function pullListen(url)  { this.send('link/listen/url', url) }
  )
  .in('link/stream').bind(
    function pullKineticObjects(stream) { stream.pipe(this.parent) }
  )

