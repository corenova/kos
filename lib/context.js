'use strict';

const debug = require('debug')('kos:context')
const delegate = require('delegates')
const KineticToken = require('./token')

const proto = module.exports = {
  get(...keys) {
    const { state } = this
    let res = keys.map(key => {
      if (state.has(key)) 
        return state.get(key)
      if (this.parent) 
        return this.parent.get(key)
      return null
    })
    return res.length > 1 ? res : res[0]
  },

  send(key, ...values) {
    // if already flushed, then send it as we observe them
    if (this.flushed === true) return this.trigger.send(...arguments)
    // preserve an instance of the token inside state machine
    this.has(key) || this.set(key, new KineticToken(key, this.id))
    this.get(key).add(...values)
  },

  flush() {
    this.outputs.forEach(key => {
      let token = this.state.get(key)
      if (token) {
        debug(this.id, `flushing ${key} (${token.length})`)
        this.trigger.push(token.compress())
        this.delete(key)
      }
    })
    this.flushed = true
  }
}

delegate(proto, 'trigger')
  .getter('id')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('reactor')
  .getter('parent')
  .method('post') // XXX - should get rid of this
  .method('feed') // for self-driven trigger
  .method('seen')
  .method('reset')
  // various logging facilities
  .method('debug')
  .method('info')
  .method('warn')
  .method('error')
  .method('throw')

delegate(proto, 'state')
  .method('clear')            
  .method('delete')
  .method('entries')
  .method('forEach')
  .method('has')
  .method('set')
  .method('keys')
  .method('values') 

