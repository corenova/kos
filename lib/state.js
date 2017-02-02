const delegate = require('delegates')

class KineticState extends Map {
  constructor() {
	super()
	Object.defineProperty(this, 'parent', { 
	  enumerable:false, 
	  writable:true 
	})
  }

  get ready() {
	return this.inputs.every(x => this.has(x))
  }
  
  pull(...keys) {
	if (keys.length > 1)   return keys.map((k) => this.get(k))
	if (keys.length === 1) return this.get(keys[0])
  }
}

delegate(KineticState.prototype, 'parent')
  .method('send')
  .getter('inputs')
  .getter('outputs')


module.exports = KineticState
