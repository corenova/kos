require('yang-js')

module.exports = require('./http.yang').bind({
  connector: {
    request(req) {
      const agent = this.use('superagent')
      let { url, type='json', method, data } = req
      method = method.toLowerCase()
      switch (method) {
      case 'get':
      case 'delete':
        agent[method](url).end((err, res) => { 
          if (err) this.throw(err)
          else this.send('http:response', res) 
        })
        break;
      case 'post':
      case 'put':
      case 'patch':
        agent[method](url).type(type).send(data).end((err, res) => { 
          if (err) this.throw(err)
          else this.send('http:response', res) 
        })
        break;
      }
    },

    get(req) {
      this.send('http:request', req)
    },

    listen(opts) {
      const http = this.use('node:http')
      const url  = this.use('node:url')
      if (typeof opts === 'string') {
        let dest = opts
        opts = url.parse(dest, true)
        if (!opts.slashes) opts = url.parse('http://'+dest, true)
      }
      let protocol = opts.protocol || 'http:'
      let hostname = opts.hostname || '0.0.0.0'
      let port     = parseInt(opts.port, 10) || 80

      let server = http.createServer((request, response) => {
        this.send('http:server-request', { req: request, res: response })
      })
      server.on('connection', sock => {
        let addr = `${protocol}//${sock.remoteAddress}:${sock.remotePort}`
        this.info('accept', addr)
        this.send('net:socket', sock)
        this.send('kos:connection', { addr: addr, socket: sock })
        sock.emit('active')
      })
      server.on('listening', () => {
        this.info('listening', hostname, port)
        this.send('http:server', server)
      })
      server.on('error', this.error.bind(this))
      this.debug('attempt', hostname, port)
      server.listen(port, hostname)
    },

    route(server, route) {

    },

    proxy(req, proxy) {
      this.send('http:request', Object.assign({}, req, {
        host: proxy.host
      }))
    }
  }
}

