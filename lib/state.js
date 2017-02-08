'use strict';

const delegate = require('delegates')

class KineticState extends Map {
  constructor() {
    super()
    Object.defineProperty(this, 'parent', { 
      enumerable:false, 
      writable:true 
    })
  }

  get(...keys) {
    if (keys.length > 1)   return keys.map((k) => super.get(k))
    if (keys.length === 1) return super.get(keys[0])
  }

  throw(err) {
    throw new Error(err)
  }

  // convenince to get back array of values to input key(s)
  get state() {
    return this.get(...this.inputs)
  }

  get ready() {
    return this.inputs.every(x => this.has(x))
  }
  
}

delegate(KineticState.prototype, 'parent')
  .method('pull')
  .method('send')
  .getter('inputs')
  .getter('outputs')


module.exports = KineticState
