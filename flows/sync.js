const kos = require('..')

const PushFlow = require('./push')
const PullFlow = require('./pull')

module.exports = kos.create('kos-sync')
  .summary('Provide dataflow stream pull/push to a remote flow')
  .import(PushFlow)
  .import(PullFlow)
  .in('sync').out('pull','push').bind(synchronize)
  .in('sync/url').out('sync').bind(simpleSync)

function synchronize(opts) {
  this.send('pull', opts)
  this.send('push', opts)
}
  
function simpleSync(url) {
  this.send('sync', { url: url })
}
