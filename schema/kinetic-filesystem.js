'use strict'

require('yang-js');

const Schema = require('./kinetic-filesystem.yang');

Schema.at('Reader').bind({
  openFileStream: async (ctx, opts) => {
    const fs = this.use('node:fs')
    const { path, mode, format = 'utf-8' } = opts
    const exists = this.get(`file/${path}`)
    if (exists) return this.send('/fs:file', exists)

    let fstream = fs.createReadStream(path, format)
    fstream.on('readable', () => this.send('/fs:file', fstream))
    fstream.on('end', () => this.send('/file:file/end', fstream))

    // should we save open file somewhere?
  },

  // readFileStream: async(ctx, mode, stream) => {
  //   const { delim = 'line' } = mode
  //   let { buffer, counter} = this.use(stream.path, { buffer: '', counter: 0 })
  //   let chunk;
  //   while (null !== (chunk = stream.read())) {
  //     if (delim === 'chunk') 
  // 	return this.send('/fs:file/chunk', chunk)

  //     buffer += chunk
  //     let lines = buffer.split(/\r?\n/)
  //     if (lines.length) buffer = lines.pop()
  //     this.send('/fs:file/line', ...lines)
  //     counter += lines.length
  //   }
  //   this.set(stream.path, { buffer: buffer, counter: counter })
  //   this.debug(stream.path, `read ${counter} lines`)
  //   this.clear() // clear state inputs
  // },

});

module.exports = Schema;
