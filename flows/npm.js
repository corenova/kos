// Node Package Manager transaction stream
//
// NOTE: this stream REQUIREs the 'npm' module which is usually
// available in a Node.js environment. Optionally, it can be fulfilled
// by the upstream consumer.

const { kos = require('..') } = global

module.exports = kos.create('npm')
  .summary("Provides NPM registry transactions utilizing 'npm' module")
  .require('module/npm')
  .default('loaded', false)
  .default('pending', new Set)

  .in('module/npm').out('npm/load').bind(triggerLoad)
  .in('npm/load').out('npm/loaded').bind(initialize)

  .in('npm/install').out('npm/defer','npm/installed').bind(install)

  .in('npm/defer').bind(queueCommands)
  .in('npm/loaded').out('npm/install','npm/uninstall').bind(sendCommands)

//--- Kinetic Actions Handlers

function triggerLoad(npm) {
  this.send('npm/load', { loglevel: 'silent', progress: false, loaded: false })
}

function initialize(options) {
  let npm = this.fetch('module/npm')
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
  let pending = this.fetch('pending')
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
  let [ npm, loaded ] = this.fetch('module/npm', 'loaded')
  pkgs = [].concat(pkgs).filter(String)
  if (!loaded) this.send('npm/defer', [ this.trigger, pkgs ])
  else {
    npm.commands.install(pkgs, (err, res) => {
      if (err) this.throw(err)
      else this.send('npm/installed', res)
    })
  }
}

