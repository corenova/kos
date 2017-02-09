const kos = require('./')
// const npm = kos.load('flows/npm')
// npm.feed('npm/install', 'debug')
// npm.feed('npm/install', 'delegates')
// npm.feed('module/npm', require('npm'))
// npm.on('npm/installed', res => console.log(res))

const Req = kos.load('flows/require')
Req
  .feed('require/npm')
  .feed('require/debug')
  .on('module/debug', res => console.log(res))
  .pipe(kos.debug)
