'use strict';

class KineticTrigger extends Set {

  get(...keys) {
    if (keys.length > 1)   return keys.map((k) => super.get(k))
    if (keys.length === 1) return super.get(keys[0])
  }

  has(key) {
    if (super.has(key)) return true
    // support checking via wildcards
    for (let trigger of this.keys()) {
      if (trigger.indexOf('*') === -1) continue
      let regex = '^'+trigger.replace('*','.*')+'$'
      if (key.match(regex) != null)
        return true
    }
    return false
  }

}

module.exports = KineticTrigger

