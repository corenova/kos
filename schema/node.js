'use strict'

const Yang = require('yang-js')

module.exports = require('./node.yang').bind({
  'feature(fs)':  function() { return require('fs') },
  'feature(url)': function() { return require('url') },
  'feature(net)': function() { return require('net') },

  // self-initialize when part of kos layers (usually kos directly)
  initialize(process) { 
    const parent = this.get('parent')
    this.send('node:resolve', ...parent.depends)
  },

  execute(program) {
    const { args=[], file=[], silent=false, verbose=0 } = program

    // unless silent, setup logging
    silent || this.send('node:log', { level: verbose })

    // immediate processing of 'load' tokens first
    this.sendImmediate('node:load', ...args)
    this.send('node:read', ...file)
  },

  load(name) {
    const path = this.use('node:path')
    const search = [ 
      path.resolve(name),
      path.resolve('schema', name),
      path.resolve(__dirname, name),
      name
    ]
    let schema
    let location
    for (location of search) {
      try { schema = require(location); break }
      catch (e) { 
        if (e.code !== 'MODULE_NOT_FOUND') 
          this.throw(e)
      }
    }
    if (!schema) 
      this.throw(`unable to locate schema "${name}" from ${search}`)
    
    if (!(schema instanceof Yang))
      this.throw(`unable to load incompatible schema "${name}" from ${location}`)

    this.send('kos:schema', schema)
    this.send('node:resolve', ...schema.depends)
  },

  resolve(dep) {
    const regex = /^module\/(.+)$/
    let match = regex.exec(dep,'$1')
    if (match) this.send('require', match[1])
  },

  require(opts) {
    if (typeof opts === 'string') opts = { name: opts }
    let { name, path } = opts
    try {
      const m = this.get(name) || require(path || name)
      this.has(name) || this.set(name, m)
      this.send('module/'+name, m)
    } catch (e) {
      e.target = name
      this.error(e)
    }
  },

  read(filename) {
    const fs = this.get('module/fs')
    const kson = fs.createReadStream(filename)
    kson.on('error', this.error.bind(this))
    kson.pipe(this.io, { end: false })
  }
})



