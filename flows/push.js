'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-push')
  .summary('Provide dataflow stream push to a remote flow')
  .import(NetFlow)
  .default('links', new Set)
  .in('push').out('net/connect').bind(pushConnect)
  .in('net/link').bind(pushKineticObjects)

function pushConnect(opts) {

}

function pushKineticObjects(link) {
  // should we also read from link to discover its capabilities?
  let links = this.fetch('links')
  if (!links.has(link)) {
    this.stream.pipe(link)
    links.add(link)
  }
}

