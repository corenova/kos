// HTTP client transaction flow
//
// NOTE: this flow REQUIREs the 'http' and 'url' modules and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

const { kos = require('..') } = global

module.exports = kos.create('kos-http-server')
  .summary("Provides HTTP server transactions")
  .require('module/http')
  .require('module/url')

  .in('http/listen')
  .out('http/server','http/socket','http/link','http/server/request')
  .bind(createServer)

  .in('http/server/request')
  .out('http/server/request/*')
  .bind(classifyServerTransaction)

  .in('http/server','http/route').out('http/server/request').bind(handleRoute)


function createServer(opts) {
  let http = this.fetch('module/http')
  let { protocol, hostname, port } = normalizeOptions.call(this, opts)

  let server = http.createServer((request, response) => {
    this.send('http/server/request', { req: request, res: response })
  })
  server.on('connection', sock => {
    let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
    this.info('accept', addr)
    this.send('http/socket', sock)
    this.send('http/link', { addr: addr, socket: sock })
    sock.emit('active')
  })
  server.on('listening', () => {
    this.info('listening', hostname, port)
    this.send('http/server', server)
  })
  server.on('error', this.error.bind(this))
  this.debug('attempt', hostname, port)
  server.listen(port, hostname)
}

function classifyServerTransaction(session) {
  let { req, res } = session
  let method = req.method.toLowerCase()
  this.send('http/server/request/'+method, session)
}

function normalizeOptions(opts) {
  if (typeof opts === 'string') {
    let url = this.fetch('module/url')
    if (!opts.includes('://'))
      opts = 'http://' + opts
    opts = url.parse(opts, true)
  }
  return {
    protocol: opts.protocol || 'http:',
    hostname: opts.hostname || '0.0.0.0',
    port:     parseInt(opts.port, 10) || 80
  }
}

function handleRoute(server, route) {

}

