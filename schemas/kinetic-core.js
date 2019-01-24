'use strict'

require('yang-js')

module.exports = require('./kinetic-core.yang').bind({
  Timer: {
    schedule(alarm) {
      const { name, delay, repeat, active=true } = alarm
      const { alarm: alarms=[] } = this.state || {}
      const match = alarms.find(a => a.name == name)
      const fire = (event) => this.send('core:alert', { name })
      let timer

      if (match && match.timer) {
        if (match.repeat || !active) {
          this.debug(`canceled ${name} alarm`)
          clearTimeout(match.timer)
        }
      }
      if (active) {
        if (repeat) {
          if (delay) {
            this.debug(`scheduled ${name} alarm repeat ${delay}ms intervals`)
            timer = setInterval(fire, delay)
          } else {
            this.error('cannot schedule repeating alarm without any delay');
          }
        } else {
          timer = setTimeout(fire, delay)
        }
      }
      this.save({ alarm: [{ name, delay, repeat, active, timer }] })
    }
  }
})
