'use strict';

const CircularJSON = require('circular-json')

class KineticToken {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must define label and argument')
    let [ key, origin ] = label.split('|')
    obj = CircularJSON.parse(obj)
    return new KineticToken(key, obj, origin)
  }

  constructor(key, value, origin='unknown') {
    this.key = key
    this.value = value
    this.origin = origin
	this.tags = new Map
    this.tag(origin) // ensure origin does not accept this token again
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
    let { key, value, origin } = this
    return `${key}|${origin}` + ' ' + CircularJSON.stringify(value)
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

module.exports = KineticToken
