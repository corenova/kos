'use strict';

const CircularJSON = require('circular-json')

class KineticToken {

  static fromKSON(kson) {
    let [ key, obj ] = kson.split(/\s+(.+)/)
    if (!key || !obj) throw new Error('invalid KSON, must define key and argument')
    obj = CircularJSON.parse(obj)
    return new KineticToken(key, obj)
  }

  constructor(key, value, ...tags) {
    this.key = key
    this.value = value
	this.tags = new Map
    tags.forEach(x => this.tag(x))
  }

  tag(key, val) { 
	key && this.tags.set(key, val) 
	return this
  }

  match(keys) {
    if (Array.isArray(keys)) keys = new Set(keys)
    if (!(keys instanceof Set)) return false
    if (keys.has(this.key)) return true
    for (let key of keys) {
      if (key.indexOf('*') === -1) continue
      let regex = '^'+key.replace('*','.*')+'$'
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

  get origin() {
    return this.tags.keys().next().value
  }

  get accepted() {
    for (let x of this.tags.values()) {
      if (x) return true
    }
    return false
  }
}

module.exports = KineticToken
