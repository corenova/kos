'use strict'

const Yang = require('yang-js')
module.exports = require('./kinetic-object-swarm.yang').bind({
  topology() {
    this.content = {
      checksum: 'random' 
    }
    return this.content
  }
})
