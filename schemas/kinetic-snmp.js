'use strict';

require('yang-js')

const uuid = require('uuid')

module.exports = require('./kinetic-snmp.yang').bind({
  Connector: {
    connect(remote) {
      const Snmp = this.use('snmp:net-snmp')
      const { uri, socket, port, hostname, query={} } = remote
      const { community, retries, timeout, transport, version } = query
      let session
      if (!socket) {
        this.info(`connecting to ${uri}`);
        let session = Snmp.createSession(hostname, community, { port, retries, timeout, transport, version })
        session.on('error', this.error.bind(this))
        this.send('snmp:session', { uri, agent: session })
        this.send('net:connection', { uri, socket: session.dgram })
      }
      return session
    },
    request(session, req) {
      const Snmp = this.use('snmp:net-snmp')
      const { agent } = session
      const { method, root, oids, data } = req
      const validate = (data) => {
        let error = Snmp.isVarbindError(data)
        if (error) this.error(Snmp.varbindError(data))
        return !error
      }
      switch (method) {
      case 'get':
      case 'set':
        const args = method == 'get' ? oids : data
        agent[method](args, (err, varbinds) => {
          if (err) this.error(err)
          else this.send('snmp:response', varbinds.filter(validate));
        });
        break;
      case 'walk':
        const results = []
        const feed = (varbinds) => {
          results.concat(varbinds.filter(validate))
        }
        const done = (error) => {
          if (error) this.error(err)
          else this.send('snmp:response', results)
        }
        agent[method](root, feed, done)
        break;
      }
    }
  }
})
