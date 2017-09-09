const { kos = require('kos') } = global

module.exports = kos.create('velocimeter')
  .desc("reactions to velocity measurements")
  .in('velocity').out('acceleration').bind(velocityToAcceleration)

function velocityToAcceleration(v1) {
  const v0 = this.get('prevVelocity')
  if (!v0) return this.set('prevVelocity', v1)

  if (v1.ts < v0.ts) { // flip
    const temp = v1
    v1 = v0
    v0 = temp
  }
  if (v1.ts === v0.ts) { // we would expect values to be very close
    // TODO: check for some margin of deviation
  }

  this.send('acceleration', {
    ts: v1.ts,
    value: (v1.value - v0.value) / (v1.ts - v0.ts)
  })
  this.set('prevVelocity', v1)
}
