'use strict'

require('yang-js')

module.exports = require('./kinetic-chrono.yang').bind({
  
  'Timer/schedule': async (ctx, alarm) => {
    const { name, delay, repeat, immediate, active } = alarm
    const { alarm: alarms=[] } = ctx.data || {}
    const match = alarms.find(a => a.name == name)
    const fire = (event) => ctx.send('chrono:alert', { name })
    let timer, scheduler;

    if (match && match.timer) {
      if (match.repeat || !active) {
        ctx.logDebug(`canceled ${name} alarm`)
        clearTimeout(match.timer)
      }
    }
    if (active) {
      if (repeat) {
        if (delay) {
          ctx.logDebug(`scheduled ${name} alarm repeat ${delay}ms intervals`)
          timer = setInterval(fire, delay)
        } else {
          ctx.logError('cannot schedule repeating alarm without any delay');
        }
      } else {
        timer = setTimeout(fire, delay)
      }
    }
    await ctx.push({ alarm: [{ name, delay, repeat, active, timer }] });
    if (immediate) fire(name);
  }
  
});

