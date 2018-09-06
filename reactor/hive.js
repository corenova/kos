'use strict';

const { kos = require('..') } = global

const link = require('./link')

module.exports = kos.create('hive')
  .desc('reactions to p2p hive communications')
  .pass(true)

  .load(link)

  .in('hive:connect').out('link:connect').bind(connect)
  .in('hive:listen').out('link:listen').bind(listen)

  .in('link:channel').out('kos:reactor').bind(peer)

function connect(opts) { this.send('link:connect', opts) }
function listen(opts)  { this.send('link:listen', opts) }

function peer(link) {
  const root = this.parent.parent
  link.pass(true).in('adapt').out('*').bind(sync)
  function sync(change) {
    const addr = this.get('addr')
    if (change instanceof kos.Dataflow) {
      //this.reactor.link(reactor)
      //this.send('reactor', reactor)
    } else {
      const { id, type, label, parent } = change
      change.enabled = false
      if (!root.find(id)) {
        let target = parent ? this.parent.find(parent) : this.parent
        if (!target) target = this.parent
        this.info(`importing '${label}' ${type} (${id}) into ${target.identity} from`, addr)
        target.load(change)
      } else {
        // TODO: we should somehow suppress adapt topic about itself
        this.info(`ignoring existing ${label}:${id} from peer`)
      }
    }
  }
  link.once('inactive', io => {
    // here we have an opportunity to attempt to repair it
    
  })
  // inform remote peer about the root reactor
  this.info(`informing remote peer about ${root}:`)
  link.feed('adapt', root)
  link.join(root)
  //link.join(this.parent)
  //this.send('reactor', link)
}
