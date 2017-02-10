const should = require('should')

describe("kos-flow-require", () => {
  let kos = require('..')
  let RequireFlow
  
  it('should load require flow', () => {
    RequireFlow = kos.load('flows/require')
  })

  it('should load default node.js module', done => {
    RequireFlow.on('module/url', res => done())
    RequireFlow.feed('require/url')
  })
  
  it('should load NPM module', done => {
    RequireFlow.on('module/npm', res => done())
    RequireFlow.feed('require/npm')
  })

  it('should load non-existent module (via npm install)', done => {
    RequireFlow.on('module/delegates', res => done())
    RequireFlow.feed('require/delegates')
  })
})

