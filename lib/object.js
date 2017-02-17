'use strict';

class KineticObject {
  constructor(key, value, origin) {
    this.key = key
    this.value = value
    this.origin = origin
	this.tags = new Set
  }
  tag(x) { 
	this.tags.add(x) 
	return this
  }
}

module.exports = KineticObject
