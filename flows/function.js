// Function execution flow

const kos = require('..')

module.exports = kos.flow
  .label('kos-flow-function')
  .summary("Provides dynamic function exeuction via messages")
  .require('function')
  .in('arguments').out('return').require('function','caller')
  .bind(function exec({ value }) {
    let [ f, ctx ] = this.pull('function','caller')
    try { this.send('return', f.apply(ctx,value)) }
    catch (e) { this.throw(e) }
  })
  
