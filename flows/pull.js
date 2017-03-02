'use strict'

const kos = require('..')
const NetFlow = require('./net')

module.exports = kos.create('kos-pull')
  .summary('Provide dataflow stream pull from remote flow(s)')
  .include(NetFlow)
  .default('links', new Set)
  .in('pull').out('net/connect').bind(pullConnect)
  .in('net/link').bind(pullKineticObjects)

function pullConnect(opts) {

}

function pullKineticObjects(link) {
  let links = this.fetch('links')
  if (!links.has(link)) {
    link.pipe(this.stream)
    links.add(link)
  }
}
