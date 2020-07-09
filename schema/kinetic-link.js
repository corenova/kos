'use strict'

const Yang = require('yang-js');
const Schema = require('./kinetic-link.yang');

Schema.at('Synchronizer').bind({

  select: async (ctx, input) => {
    const { protocol } = input;
    switch (protocol) {
    case 'ws':
    case 'wss':
      ctx.send('ws:endpoint', input);
      break;
    case 'tcp':
    case 'udp':
      ctx.send('net:endpoint', input);
      break;
    default:
      ctx.logWarn('unsupported protocol', protocol);
    }
  },

  sync: async (ctx, connection) => {
    const Channel = ctx.use('kos:channel');
    const { uri, socket } = connection;
    // create a temporary channel to exchange personas
    let stream = new Channel(socket).connect(ctx.root);
    ctx.send('link:session', { uri, stream });
  },

});

module.exports = Schema;

// TBD...
function sync(connection) {
  const Channel = this.use('kos:channel')
  //const Interface = this.use('kos:interface')
  const { uri, socket } = connection
  // create a temporary channel to exchange personas
  let stream = new Channel(socket).connect(this.root);
  this.send('link:session', { uri, stream });
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
