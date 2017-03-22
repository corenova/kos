'use strict';

const CircularJSON = require('circular-json')

class KineticObject {

  static fromKSON(kson) {
    let [ key, obj ] = kson.split(/\s+(.+)/)
    if (!key || !obj) throw new Error('invalid KSON, must define key and argument')
    obj = CircularJSON.parse(obj)
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

  match(triggers = new Set) {
    if (triggers.has(this.key)) return true
    for (let trigger of triggers) {
      if (trigger.indexOf('*') === -1) continue
      let regex = '^'+trigger.replace('*','.*')+'$'
      if (this.key.match(regex) != null)
        return true
    }
    return false
  }

  toKSON() {
    let { key, value } = this
    return key + ' ' + CircularJSON.stringify(value)
  }

  toJSON() {
    let { key, value } = this
    if (typeof value === 'function') value = null
    return '{"' + key + '":' + CircularJSON.stringify(value) + '}'
  }

  get accepted() {
    for (let x of this.tags.values()) {
      if (x) return true
    }
    return false
  }
}

module.exports = KineticObject
