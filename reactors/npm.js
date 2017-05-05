// Node Package Manager transaction stream
//
// NOTE: this stream REQUIREs the 'npm' module which is usually
// available in a Node.js environment. Optionally, it can be fulfilled
// by the upstream consumer.

const { kos = require('..') } = global

module.exports = kos.create('npm')
  .desc("reactions to NPM package management requests")
  .init('loaded', false)
  .init('pending', new Set)

  .in('module/npm').out('npm/load').bind(triggerLoad)

  .in('npm/load').and.has('module/npm')
  .out('npm/loaded').bind(initialize)

  .in('npm/install').out('npm/defer','npm/installed').bind(install)

  .in('npm/loaded').and.has('module/npm')
  .out('npm/install','npm/uninstall').bind(sendCommands)

  .in('npm/defer').bind(queueCommands)

  .in('require/error').out('npm/install').bind(autoFetchMissing)
  .in('npm/installed').out('require').bind(handleAutoFetch)


//--- Kinetic Actions Handlers

function triggerLoad(npm) {
  this.send('npm/load', { loglevel: 'silent', progress: false, loaded: false })
}

function initialize(options) {
  let npm = this.get('module/npm')
  npm.load(options, (err, res) => {
    if (err) this.throw(err)
    else {
      this.post('loaded', true)
      this.send('npm/loaded', true)      
    }
  })
}

function queueCommands(defer) {
  this.post('pending', defer)
}

function sendCommands() {
  let pending = this.get('pending')
  let install = new Set
  for (let cmd of pending) {
    let [ key, arg ] = cmd
    switch (key) {
    case 'npm/install': arg.forEach(pkg => install.add(pkg))
      break;
    default: this.send(key, arg)
      break;
    }
  }
  pending.clear()
  if (install.size)
    this.send('npm/install', Array.from(install))
}

function install(pkgs) {
  let [ npm, loaded ] = this.get('module/npm', 'loaded')
  pkgs = [].concat(pkgs).filter(String)
  if (!loaded) this.send('npm/defer', [ this.trigger, pkgs ])
  else {
    npm.commands.install(pkgs, (err, res) => {
      if (err) this.throw(err)
      else this.send('npm/installed', res)
    })
  }
}

function autoFetchMissing(error) {
  let { target, code } = error
  if (target === 'npm') return this.throw("cannot auto-resolve npm")
  if (code === 'MODULE_NOT_FOUND') {
    let pending = this.get('pending')
    if (pending.has(target)) return
    this.post('pending', target) // save at the flow-level
    this.send('npm/install', target)
  } else this.throw(error)
}

function handleAutoFetch() {
  let pending = this.get('pending')
  let pkgmap = new Map(this.get('npm/installed'))
  for (let [pkg, path] of pkgmap) {
    let [ name, version ] = pkg.split('@')
    if (pending.has(name)) {
      this.send('require', { 
        name: name,
        version: version,
        path: path
      })
    }
  }
}
