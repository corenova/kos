'use strict';

const { kos = require('..') } = global

const link = require('./link')

module.exports = kos.create('hive')
  .desc('reactions to p2p hive communications')
  .pass(true)

  .load(link)

  .in('hive/connect').out('link/connect').bind(connect)
  .in('hive/listen').out('link/listen').bind(listen)

  .in('link').out('reactor').bind(peer)

function connect(opts) { this.send('link/connect', opts) }
function listen(opts)  { this.send('link/listen', opts) }

function peer(link) {
  link.pass(true).in('adapt').out('*').bind(sync)
  function sync(change) {
    const addr = this.get('addr')
    if (change instanceof kos.Dataflow) {
      //this.reactor.link(reactor)
      //this.send('reactor', reactor)
    } else {
      const { id, type, label, parent } = change
      //reactor.enabled = false
      this.info(`importing '${label}' ${type} (${id}) @ ${parent} from:`, addr)
      this.debug(change)
      if (parent) {
        let target = this.parent.find(parent)
        target && target.load(change)
      } else {
        this.parent.load(change)
      }
    }
  }
  link.once('inactive', io => {
    // here we have an opportunity to attempt to repair it
    
  })
  // inform remote peer about itself
  this.info(`informing remote peer about ${kos}:`)
  link.feed('adapt', kos)
  link.join(this.parent)
  //this.send('reactor', link)
}
