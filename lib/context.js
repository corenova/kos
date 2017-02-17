'use strict';

const delegate = require('delegates')

const proto = module.exports = {
  push() { 
    return this.action.publish(...arguments) 
  }
}

delegate(proto, 'action')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .method('pull')
  .method('send')
  .method('throw')

delegate(proto, 'state')
  .method('clear')            
  .method('delete')
  .method('entries')
  .method('forEach')
  .method('get')
  .method('has')
  .method('set')
  .method('keys')
  .method('set')
  .method('values') 

