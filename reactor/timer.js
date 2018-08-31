'use strict'

const { kos = require('kos') } = global

module.exports = kos.create('timer')
  .desc("reactions to timer schedule and alarm events")

  .in('timer:once')
  .out('timer:event/*')
  .bind(once)

  .in('timer:every')
  .out('timer:event/*')
  .bind(every)

  .in('timer:stop')
  .bind(stop)

function once(opts) {
  const { name, ms } = opts
  if (this.get(name)) return this.warn(`cannot schedule more than once for ${name}`)
  let timer = setTimeout(fire.bind(this), ms)
  this.save({ [name]: timer })

  function fire(evt) {
    this.save({ [name]: null })
    this.send(`timer:event/${name}`, opts)
  }
}

function every(opts) {
  const { name, ms } = opts
  if (this.get(name)) return this.warn(`cannot schedule more than once for ${name}`)
  let timer = setInterval(fire.bind(this), ms)
  this.save({ [name]: timer })

  function fire(evt) {
    this.send(`timer:event/${name}`, opts)
  }
}

function stop(name) {
  let timer = this.get(name)
  if (timer) clearTimeout(timer)
  this.save({ [name]: null })
}
