'use strict'

const { kos = require('..') } = global
const link = require('./link')

module.exports = kos.reactor('sync')
  .desc('reactions to synchronize dataflow objects with remote stream(s)')
  .load(link)

  .in('sync/connect').out('link/connect/url').bind(
    function syncConnect(url) { this.send('link/connect/url', url) }
  )
  .in('sync/listen').out('link/listen/url').bind(
    function syncListen(url) { this.send('link/listen/url', url) }
  )
  .in('link/stream').out('sync/stream').bind(
    function syncKineticObjects(stream) { 
      this.parent.pipe(stream)
      stream.on('active', () => {
        stream.pipe(this.parent)
        this.send('sync/stream', stream)
      })
    }
  )
