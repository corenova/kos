'use strict'

const Yang = require('yang-js')

module.exports = require('./kinetic-link.yang').bind({
  // Bind Reactions
  connect, listen, sync
})

function connect(remote) {
  const { protocol } = remote

  switch (protocol) {
  case 'ws':
  case 'wss':
    this.send('ws:remote', remote)
    break;
  case 'tcp':
  case 'udp':
    this.send('net:remote', remote)
    break;
  default:
    this.warn('unsupported protocol', protocol)
  }
}

function listen(local) {
  const { protocol } = local

  switch (protocol) {
  case 'ws':
  case 'wss':
    this.send('ws:local', local)
    break;
  case 'tcp':
  case 'udp':
  case undefined:
    this.send('net:local', local)
    break;
  default:
    this.warn('unsupported protocol', protocol)
  }
}

function sync(connection) {
  const Channel = this.use('kos:channel')
  const Interface = this.use('kos:interface')
  const { uri, socket, server } = connection
  // create a temporary channel to exchange personas
  let sync = new Channel(socket, this.root)
  this.root.pipe(sync)
  sync.pipe(this.root)
  return

  // TODO: later...
  let mine = Yang.module.map(m => m.tag)
  let deps = new Map
  let pulse = this.create('kos:persona', this.root)
  sync.on('data', pulse => {
    const { topic, data } = pulse
    this.info(`got ${topic} pulse`, data)
    if (topic === 'kos:persona') {
      const peer = new Set
      const scan = (node) => {
        node.layers.forEach(scan)
        peer.add(node.uri)
      }
      scan(data)
      const diff = mine.filter(x => !peer.has(x)).map(x => {
        return this.lookup('module', x).toString()
      })
      this.info(diff)
      const pulse = this.create('kos:schema', ...diff)
      sync.write(pulse)
    }
    if (topic === 'kos:schema') {
      this.info(data)
    }
    
    // let peer = new Interface(data)
    // let link = new Channel(socket, peer)
    // peer.connect(link)
    // this.send('link:peer', peer)

    // sync.destroy()
  })
  sync.write(pulse)
}
