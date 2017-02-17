// Module loader flow

const kos = require('..')

const NpmFlow = require('./npm')

module.exports = kos.flow
  .label('kos-flow-require')
  .summary("Provides external module loading via 'require'")
  .use(NpmFlow)
  .default('pending', new Set)
  .in('require').out('module/*').bind(tryRequire)
  .in('require:error').out('npm/install').bind(autoFetchMissing)
  .in('require','npm/installed').out('require').bind(handleAutoFetch)

function tryRequire(opts) {
  let pending = this.pull('pending')
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
  if (code === 'MODULE_NOT_FOUND' && this.pull('module/npm')) {
    let pending = this.pull('pending')
    if (pending.has(target)) return
    this.push('pending', target) // save at the flow-level
    this.send('npm/install', target)
  } else this.throw(error)
}

function handleAutoFetch() {
  let pending = this.pull('pending')
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
