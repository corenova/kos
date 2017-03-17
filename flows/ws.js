// WebSocket transaction flow
//
// NOTE: this flow REQUIREs the 'ws' and 'url' module and will become
// active if already present locally, receives it from the upstream,
// or fed by the user directly.

'use strict'

const kos = require('..')

module.exports = kos.create('kos-ws')
  .summary("Provides WebSocket transactions utilizing 'ws' module")
  .require('module/ws', 'module/url')
  .default('protocols', ['ws:', 'wss:'])

  .in('ws/connect').out('ws/socket','ws/link').bind(connect)
  .in('ws/listen').out('ws/server','ws/socket','ws/link').bind(listen)

  .in('ws/connect/url').out('ws/connect').bind(connectByUrl)
  .in('ws/listen/url').out('ws/listen').bind(listenByUrl)


function connect(opts) {
  const WebSocket = this.fetch('module/ws')
  const protocols = this.fetch('protocols')

  let { protocol, hostname, port, path, retry, max } = normalizeOptions(opts)
  if (!protocols.includes(protocol)) 
    return this.error('unsupported protocol', protocol)

  let addr = `${protocol}//${hostname}:${port}/${path}`
  let wsock = new WebSocket(addr)

  this.send('ws/link', { addr: addr, socket: wsock })

  wsock.on('open', () => {
    this.info("connected to", addr)
    this.send('ws/socket', wsock)
    wsock.emit('active')
    if (retry) retry = 100
  })
  wsock.on('close', () => {
    // find out if explicitly being closed?
    retry && setTimeout(() => {
      this.debug("attempt reconnect", addr)
      // NOTE: we don't use this.send here because self-generated
      // KOs that can trigger itself are filtered to prevent
      // infinite loops
      this.feed('ws/connect', Object.assign({}, opts, {
        retry: Math.round(Math.min(max, retry * 1.5))
      }))
    }, retry)
  })
  wsock.on('error', this.error.bind(this))
}

function listen(opts) {

}

function connectByUrl(dest) {
  let url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'ws://' + dest
  let opts = url.parse(dest, true)
  this.send('ws/connect', Object.assign(opts, opts.query))
}

function listenByUrl(dest) {
  let url = this.fetch('module/url')
  if (!dest.includes('://'))
    dest = 'ws://' + dest
  let opts = url.parse(dest, true)
  this.send('ws/listen', Object.assign(opts, opts.query))
}

function normalizeOptions(opts) {
  return {
    protocol: opts.protocol || 'ws:',
    hostname: opts.hostname || '0.0.0.0',
    port:     parseInt(opts.port, 10) || 80,
    path:     opts.path || '',
    retry:    parseInt(opts.retry, 10) || 100,
    max:      parseInt(opts.max, 10) || 5000
  }
}

