// Module loader flow

const kos = require('..')

const NpmFlow = require('./npm')

module.exports = kos.flow
  .label('kos-flow-require')
  .summary("Provides external module loading via 'require'")
  .use(NpmFlow)
  .default('pending', new Set)
  .in('require').out('module/*')
  .bind(function tryRequire({ value }) {
    let pending = this.pull('pending')
    let { name, path } = value
    try {
      this.send('module/'+name, require(path || name))
      pending.delete(name)
    } catch (e) {
      e.target = name
      this.throw(e)
    }
  })
  .in('require/*').out('require')
  .bind(function normalize({ key, value={} }) {
    let name = key.replace(/^.*\/(.+)$/,'$1')
    value.name = name
    this.send('require', value)
  })
  .in('error').out('npm/install')
  .bind(function autoFetchMissing({ value }) {
    let pending = this.pull('pending')
    let { target, code } = value
    if (code === 'MODULE_NOT_FOUND') {
      console.log('not found '+target)
      if (target === 'npm') return this.throw("cannot auto-resolve npm")
      if (pending.has(target)) return
      this.push('pending', target) // save at the flow-level
      this.send('npm/install', { name: target })
    }
  })
  .in('require','npm/installed').out('require')
  .bind(function handleAutoFetch() {
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
  })

