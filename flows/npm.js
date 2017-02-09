// HTTP transaction flow
//
// NOTE: this flow REQUIREs the 'npm' module which is usually
// available in a Node.js environment. Optionally, it can be fulfilled
// by the upstream consumer.

const kos = require('..')
const path = require('path')

const NpmFlow = kos.flow
  .label('kos-flow-npm')
  .summary("Provides NPM registry transactions utilizing 'npm' module")
  .require('module/npm')
  .default({
    pending: new Set,
    installing: new Set
  })
  .in('module/npm').out('npm/load')
  .bind(function triggerLoad() {
    this.send('npm/load', { loglevel: 'silent', loaded: false })
  })
  .in('npm/load').out('npm:ready').bind(initialize)
  .in('npm/install').out('npm/installed').require('npm:ready').bind(install)
  .in('npm/install/*').out('npm/install').bind(installByName)
  .in('npm/*').bind(queueCommands)
  .in('npm:ready').out('npm/*').bind(sendCommands)

module.exports = NpmFlow

function initialize({ value }) {
  let npm = this.pull('module/npm')
  console.log("initialize npm")
  npm.load(value, (err, res) => {
    if (err) this.throw(err)
    else this.send('npm:ready', true)
  })
}

function queueCommands(msg) {
  let ready = this.pull('npm:ready')
  if (!ready && msg.key !== 'npm/load') 
    this.push('pending', msg)
}

function sendCommands() {
  let pending = this.pull('pending')
  let install = new Set
  for (let cmd of pending) {
    if (cmd.key === 'npm/install')
      install.add(cmd.value)
    else
      this.send(cmd.key, cmd.value)
  }
  pending.clear()
  if (install.size)
    this.send('npm/install', Array.from(install))
}

function install(msg) {
  let npm = this.pull('module/npm')
  let pkgs = msg.value
  if (!Array.isArray(pkgs)) pkgs = [ pkgs ]
  pkgs = [].concat(...pkgs).filter(String)
  npm.commands.install(pkgs, (err, res) => {
    if (err) this.throw(err)
    else this.send('npm/installed', new Map(res))
  })
}

function installByName({ key }) {
  let req = key.replace(/^.*\/(.+)$/)
  this.send('npm/install', req)
}
