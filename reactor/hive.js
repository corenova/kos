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
  link.pass(true).in('reactor').out('*').bind(sync)
  function sync(reactor) {
    const addr = this.get('addr')
    if (reactor instanceof kos.Reactor) {
      //this.reactor.link(reactor)
      //this.send('reactor', reactor)
    } else {
      const { label, id } = reactor
      reactor.enabled = false
      this.info(`importing '${label}' reactor (${id}) from:`, addr)
      this.load(reactor)
    }
  }
  link.once('inactive', io => {
    // here we have an opportunity to attempt to repair it
    
  })
  link.join(this.reactor)

  //link.feed('reactor', ...kos.reactors)
  //this.send('reactor', link)
}
