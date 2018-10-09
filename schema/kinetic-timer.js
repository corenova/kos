'use strict'

require('yang-js')

module.exports = require('./kinetic-timer.yang').bind({
  once, every, stop
})

function once(opts) {
  const { name, ms } = opts
  //if (this.get(`/timer:alarm['${name}']`)) return this.warn(`cannot schedule more than once for ${name}`)
  let timer = setTimeout(fire.bind(this), ms)
  //this.save({ [name]: timer })

  function fire(evt) {
    //this.save({ [name]: null })
    this.send(`timer:fire`, opts)
  }
}

function every(opts) {
  const { name, ms } = opts
  //if (this.get(name)) return this.warn(`cannot schedule more than once for ${name}`)
  let timer = setInterval(fire.bind(this), ms)
  //this.save({ [name]: timer })

  function fire(evt) {
    this.send(`timer:fire`, opts)
  }
}

function stop(name) {
  let timer = this.get(name)
  if (timer) clearTimeout(timer)
  //this.save({ [name]: null })
}
