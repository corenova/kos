const KineticObjectStream = require('./lib/kos')

function kos(options) {
  return new KineticObjectStream(options)
}
Object.defineProperty(kos, 'flow', {
  get() { return new KineticObjectStream }
})

kos.Stream = KineticObjectStream
kos.Object = require('./lib/object')
kos.Action = require('./lib/action')
kos.Transform = require('./lib/transform')

exports = module.exports = kos['default'] = kos.kos = kos

exports.debug = new kos.Action((key,val) => console.log(key+':'+val))
