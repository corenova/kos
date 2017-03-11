'use strict';

class KineticObject {

  static fromKSON(kson) {
    let [ key, obj ] = kson.split(/\s+(.+)/)
    if (!key || !obj) throw new Error('invalid KSON, must define key and argument')
    obj = JSON.parse(obj)
    return new KineticObject(key, obj)
  }

  constructor(key, value, ...tags) {
    this.key = key
    this.value = value
	this.tags = new Map
    tags.forEach(x => this.tag(x))
  }

  tag(key, val) { 
	this.tags.set(key, val) 
	return this
  }

  toKSON() {
    let { key, value } = this
    if (typeof value === 'function') value = null
    return key + ' ' + JSON.stringify(value)
  }

  toJSON() {
    let { key, value } = this
    if (typeof value === 'function') value = null
    return '{"' + key + '":' + JSON.stringify(value) + '}'
  }

  get accepted() {
    for (let x of this.tags.values()) {
      if (x) return true
    }
    return false
  }
}

module.exports = KineticObject
