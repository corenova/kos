const KineticObjectStream = require('./lib/stream')
const path = require('path')

function kos(options) {
  return new KineticObjectStream(options)
}
Object.defineProperty(kos, 'flow', {
  get() { return new KineticObjectStream }
})

kos.load = function(flowfile) {
  let flow
  try {
	flow = require(flowfile)
  } catch (e) {
	flow = require(path.resolve(flowfile))
  }
  return flow
}

kos.Stream = KineticObjectStream
kos.Object = require('./lib/object')
kos.Action = require('./lib/action')
kos.Transform = require('./lib/transform')

exports = module.exports = kos['default'] = kos.kos = kos

// for debugging, you can pipe your flow to this
// ex. myFlow.pipe(kos.debug)
exports.debug = (new kos.Action).in('*').bind(function debug(msg) {
  console.log('['+ msg.key +']')
  console.log(msg.value)
})
