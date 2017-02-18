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
}

module.exports = KineticObject
