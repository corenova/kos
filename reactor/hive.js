'use strict';

const { kos = require('..') } = global

const link = require('./link')

module.exports = kos.create('hive')
  .desc('reactions to p2p hive communications')
  .pass(true)

  .load(link)

  .in('hive/connect').out('link/connect').bind(connect)
  .in('hive/listen').out('link/listen').bind(listen)

  .in('link').out('persona').bind(peer)

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
  link.once('inactive', io => {
    // here we have an opportunity to attempt to repair it
    
  })
  link.join(this.persona)

  //link.feed('persona', ...kos.personas)
  //this.send('persona', link)
}
