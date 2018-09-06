'use strict'

module.exports = require('./kinetic-console.yang').bind({
  'feature(colors)': () => require('colors')
})
