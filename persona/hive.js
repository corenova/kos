'use strict';

const { kos = require('..') } = global

module.exports = kos.create('hive')
  .desc('reactions to p2p hive communications')
  .pass(true)

  .in('hive/connect').out('link/connect').bind(connect)
  .in('hive/listen').out('link/listen').bind(listen)

  .in('link').bind(peer)

function connect(opts) { this.send('link/connect', opts) }
function listen(opts)  { this.send('link/listen', opts) }

function peer(link) {
  link.pass(true).in('persona').out('*').bind(sync)
  function sync(persona) {
    const addr = this.get('addr')
    if (persona instanceof kos.Persona) {
      //this.reactor.link(persona.core)
      //this.send('persona', persona)
    } else {
      const { label, id } = persona
      persona.enabled = false
      this.info(`importing '${label}' persona (${id}) from:`, addr)
      this.load(persona)
    }
  }
  //link.feed('persona', ...kos.personas)
  link.join(this.reactor)
}
