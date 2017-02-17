'use strict';

class KineticState extends Map {

  get(...keys) {
    if (keys.length > 1)   return keys.map((k) => super.get(k))
    if (keys.length === 1) return super.get(keys[0])
  }
  has(...keys) { return keys.every(x => super.has(x)) }

}

module.exports = KineticState
