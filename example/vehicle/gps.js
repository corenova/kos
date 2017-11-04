const { kos = require('kos') } = global

module.exports = kos.create('velocimeter')
  .desc("reactions to velocity measurements")
  .in('v').out('a').bind(velocityToAcceleration)

function velocityToAcceleration(v) {
  const prev = this.get('velocity')
  if (!prev) return this.set('velocity', v)
  this.send('a', {
    ts: v.ts,
    value: (v.value - prev.value) / (v.ts - prev.ts)
  })
  this.set('velocity', v)
}
