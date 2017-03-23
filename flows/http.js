// HTTP transaction flow
//
// NOTE: this flow REQUIREs the 'superagent' or 'http' module and will
// become active if already present locally, receives it from the
// upstream, or fed by the user directly.

const { kos = require('..') } = global

// Composite Flow (uses HttpClient and/or HttpServer) flows dynamically
module.exports = kos.create('kos-http')
  .summary("Provides HTTP client and/or server transforms")
  .include(require('./http-client'))
  .include(require('./http-server'))
  // actions
  .in('http/request/get/url').out('http/request/get')
  .bind(function simpleGet(url) {
    this.send('http/request/get', { url: url })
  })
  // TODO: future
  .in('http/server/request','http/proxy').out('http/request').bind(proxy)

function proxy(req, proxy) {
  req.host = proxy.host
  this.send('http/request', req)
}
