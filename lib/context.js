'use strict';

const delegate = require('delegates')

const proto = module.exports = {
  get(...keys) {
    let res = keys.map(key => {
      if (this.state.has(key)) 
        return this.state.get(key)
      if (this.parent) 
        return this.parent.state.get(key)
      return null
    })
    return res.length > 1 ? res : res[0]
  }
}

delegate(proto, 'trigger')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('parent')
  .method('post')
  .method('send')
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
  .method('set')
  .method('values') 

