'use strict';

class KineticObject {
  constructor(key, value, ...tags) {
    this.key = key
    this.value = value
	this.tags = new Set(tags)
  }
  tag(x) { 
	this.tags.add(x) 
	return this
  }
  toJSON() {
    let json = {}
    if (typeof this.value === 'function')
      json[this.key] = null
    else
      json[this.key] = this.value
    return json
  }
}

module.exports = KineticObject
