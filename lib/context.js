'use strict';

const delegate = require('delegates')

const proto = module.exports = {}

delegate(proto, 'reactor')
  .getter('state')
  .getter('inputs')
  .getter('outputs')
  .getter('stream')
  .method('fetch')
  .method('post')
  .method('send')
  .method('feed')

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
  .method('get')
  .method('has')
  .method('set')
  .method('keys')
  .method('set')
  .method('values') 

