// Node Package Manager flow observer
//
// NOTE: this stream REQUIREs the 'npm' module which is usually
// available in a Node.js environment. Optionally, it can be fulfilled
// by the upstream consumer.

const { kos = require('..') } = global

module.exports = kos.create('npm')
  .desc("reactions to NPM package management requests")
  .init({
    ready: false
  })

  .in('module/npm')
  .out('npm:load')
  .bind(triggerLoad)

  .pre('module/npm')
  .in('npm:load')
  .out('npm:loaded')
  .bind(initialize)

  .pre('module/npm')
  .in('npm:install')
  .bind(queueInstall)

  .pre('module/npm')
  .in('npm:install','npm:loaded')
  .out('npm:installed')
  .bind(install)

  // reactions to "run" reactor
  .in('error').out('npm:install').bind(autoFetchMissing)
  .in('npm:installed').out('node:require').bind(handleAutoFetch)


//--- Kinetic Actions Handlers

function triggerLoad(npm) {
  this.send('npm:load', { loglevel: 'silent', progress: false, loaded: false })
}

function initialize(options) {
  const npm = this.get('module/npm')
  npm.load(options, (err, res) => {
    if (err) this.throw(err)
    else {
      this.save({ pending: new Set, ready: true })
      this.send('npm:loaded', true)
    }
  })
}

function queueInstall(pkgs=[]) { 
  this.get('ready') || pkgs.forEach(pkg => this.get('pending').add(pkg))
}

function install(pkgs=[]) {
  const [ npm, pending ] = this.get('module/npm', 'pending')
  pkgs.forEach(pkg => pending.add(pkg))
  pkgs = Array.from(pending).filter(String)
  pending.clear()
  this.delete('npm:install')

  npm.commands.install(pkgs, (err, res) => {
    if (err) return this.error(err)
    this.send('npm:installed', res)
  })
}

function autoFetchMissing(error) {
  let { target, code } = error
  if (code === 'MODULE_NOT_FOUND') {
    const pending = this.get('pending')
    if (target === 'npm') return this.throw("cannot auto-resolve npm")
    if (pending.has(target)) return
    this.send('npm:install', [ target ])
  }
}

function handleAutoFetch(installed) {
  const pkgmap = new Map(installed)
  for (let [pkg, path] of pkgmap) {
    let [ name, version ] = pkg.split('@')
    this.send('node:require', { 
      name: name,
      version: version,
      path: path
    })
  }
}
