'use strict';

function compareKeys(k1, k2) {
  if (k1 == k2) return true
  if (!k1 || !k2) return false

  if (typeof k1 === 'string' && typeof k2 === 'string') {
    let x = '^'+k1.replace('*','.*')+'$'
    let y = '^'+k2.replace('*','.*')+'$'
    return (k2.match(x) != null || k1.match(y) != null)
  }
  if (typeof k2 === 'string') return k2.match(k1) != null
  if (typeof k1 === 'string') return k1.match(k2) != null
  
  return false
}

function contains(key) {
  return this.some(x => compareKeys(x, key))
}

class KineticState extends Map {
  static get contains() { return contains }

  constructor() {
    super()
    Object.defineProperty(this, 'parent', { 
      enumerable:false, 
      writable:true 
    })
  }

  ready(ko) {
    if (!this.parent) return false
    this.set(ko.key, ko.value)
    if (this.size < this.parent.inputs.length) return false
    let keys = Array.from(this.keys())
    return this.parent.inputs.every(x => contains.call(keys, x))
  }
  
  get(...keys) {
    if (keys.length > 1)   return keys.map((k) => super.get(k))
    if (keys.length === 1) return super.get(keys[0])
  }

  // interfaces to parent's state
  pull() { return this.parent.pull(...arguments) }
  push() { return this.parent.publish(...arguments) }

  // send message (next is just an alias)
  send() { return this.parent.send(...arguments) }
  get next() { return this.send }

  throw() { return this.parent.throw(...arguments) }

  // convenience to get back array of values to input key(s)
  get inputs() {
    if (!this.parent) return []
    return this.get(...this.parent.inputs)
  }

}

module.exports = KineticState
