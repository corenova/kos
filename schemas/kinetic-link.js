'use strict'

require('yang-js');

const Synchronizer = {
  
  select(input) {
    const { protocol } = input
    switch (protocol) {
    case 'ws':
    case 'wss':
      this.send('ws:endpoint', input)
      break;
    case 'tcp':
    case 'udp':
      this.send('net:endpoint', input)
      break;
    default:
      this.warn('unsupported protocol', protocol)
    }
  },

  sync(connection) {
    const Channel = this.use('kos:channel');
    const { uri, socket } = connection
    // create a temporary channel to exchange interfaces
    const stream = new Channel(socket);
    

    stream.connect(this.root);
    this.send('link:session', { uri, stream });
  },
};


module.exports = require('./kinetic-link.yang').bind({ Synchronizer });

