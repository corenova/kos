
const kos = require('..')

module.exports = kos.create('kos-core')
  .require('module/net')
  .in('kos/load').out('stream/*').bind(loadStream)
  .in('kos/run').out('kos/server','kos/client').bind(runInstance)
  .in('kos/link').bind(linkFlow)
  .in('kos/client').bind(registerClient)

function loadStream(file) {
  if (typeof file === 'string')
    stream = kos.load(file)
  this.send('flow/'+flow.label, flow)
}

function runInstance(opts) {
  let net = this.fetch('module/net')
  let { port=1505, host='127.0.0.1' } = opts
  let server = net.createServer(this.send.bind(this, 'kos/client'))
  server
    .on('error', this.throw.bind(this))
    .on('listening', this.send.bind(this, 'kos/server'))
    .listen(port, host)
}

function registerClient(conn) {
  const addr = conn.remoteAddress + ':' + conn.remotePort
  this.debug('accept %s', addr)
  conn.on('close', => {
    this.debug('disconnect %s', addr)
  })
}

function linkFlow(url) {
  
}
