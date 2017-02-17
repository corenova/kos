const KineticObjectStream = require('./lib/stream')
const path = require('path')

const kos = new KineticObjectStream({ label: 'core' })

kos.load = function(flowfile) {
  let flow
  try {
	flow = require(flowfile)
  } catch (e) {
	flow = require(path.resolve(flowfile))
  }
  if (!(flow instanceof KineticObjectStream))
    throw new Error("kos.load should only load KineticObjectStream")
  return flow
}

kos.Stream = KineticObjectStream
kos.Object = require('./lib/object')
kos.Action = require('./lib/action')
kos.Transform = require('./lib/transform')

exports = module.exports = kos['default'] = kos.kos = kos

// for debugging, you can pipe your flow to this
// ex. myFlow.pipe(kos.debug)
try { var debug = require('debug')('kos/debug') }
catch (e) { var debug = console.log }

kos.debug = (new kos.Action).in('*').bind(function log(msg) {
  debug(msg.key)
  debug(msg.value)
})
