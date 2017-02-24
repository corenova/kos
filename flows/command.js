// Command Processing Flow

const kos = require('..')
const core = require('./core')
const render = require('./render')

module.exports = kos.create('kos-command')
  .summary('Provides command-line execution workflow')
  .include(core)
  .include(render)

// flow triggers
  .on('run').bind(invokeRun)
  .on('show').bind(showFlowDetails)

function invokeRun(opts) {
  let { host, port, args } = opts
  

}

function showFlowDetails(opts) {
  let { json, yaml, args } = opts

  return co => {
    this.send('kos/render', ...args)
    this.on('kos/info', x => x)
  }
}
