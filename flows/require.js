// Module loader stream

const kos = require('..')

module.exports = kos.create('kos-require')
  .summary("Provides external module loading via 'require'")
  .default('pending', new Set)
  .import('kos-npm')

  // transforms
  .in('require').out('module/*').bind(tryRequire)
  .in('require:error').out('npm/install').bind(autoFetchMissing)
  .in('require','npm/installed').out('require').bind(handleAutoFetch)

function tryRequire(opts) {
  let pending = this.fetch('pending')
  if (typeof opts === 'string') opts = { name: opts }
  let { name, path } = opts
  try {
    this.send('module/'+name, require(path || name))
    pending.delete(name)
  } catch (e) {
    e.target = name
    this.throw(e)
  }
}

function autoFetchMissing(error) {
  let { target, code } = error
  if (target === 'npm') return this.throw("cannot auto-resolve npm")
  if (code === 'MODULE_NOT_FOUND' && this.fetch('module/npm')) {
    let pending = this.fetch('pending')
    if (pending.has(target)) return
    this.post('pending', target) // save at the flow-level
    this.send('npm/install', target)
  } else this.throw(error)
}

function handleAutoFetch() {
  let pending = this.fetch('pending')
  let pkgmap = this.get('npm/installed')
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
