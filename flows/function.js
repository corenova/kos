// Function execution flow

const kos = require('..')

module.exports = kos.flow('kos-function')
  .summary("Provides dynamic function exeuction via messages")
  .require('function')
  .in('caller').bind(exec) // optional, but should be sent BEFORE arguments
  .in('arguments').out('return').bind(exec)
  
function exec(args) {
  if (this.trigger === 'caller') return this.set('caller', args)

  let f = this.pull('function')
  let ctx = this.get('caller')
  try { this.send('return', f.apply(ctx, args)) }
  catch (e) { this.throw(e) }
}
