'use strict';

const CircularJSON = require('circular-json')

class Stimulus extends Array {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must specify both topic and payload')
    let [ topic, origin ] = label.split('|')
    obj = CircularJSON.parse(obj)
    return new Stimulus(topic, origin).add(obj)
  }

  constructor(topic, origin=null) {
    super()
    this.topic  = topic
    this.origin = origin
	this.tags = new Map
    this.tags.set(origin)
  }

  add() {
    this.push(...arguments)
    return this
  }

  compress() {
    if (this.length > 1) {
      let uniques = [ ...new Set(this) ]
      if (this.length !== uniques.length) {
        this.splice(0, this.length, ...uniques)
      }
    }
    return this
  }

  tag(topic, val) { 
	topic && this.tags.set(topic, val) 
	return this
  }

  match(keys) {
    if (!arguments.length) return null
    if (arguments.length > 1) keys = arguments
    if (typeof keys === 'string') keys = [ keys ]
    //if (keys instanceof Set && keys.has(this.key)) return true
    let idx = -1
    for (let key of keys) {
      idx++
      if (this.key === key) return [ idx, key ]
      if (!key || key.indexOf('*') === -1) continue
      let regex = '^'+key.replace('*','.*')+'$'
      if (this.key.match(regex) != null)
        return [ idx, key ]
    }
    return null
  }

  toKSON() {
    let { topic, origin } = this
    let label = origin ? `${topic}|${origin}` : key
    return this.map(value => label+' '+CircularJSON.stringify(value)).join("\n")
  }

  toJSON() {
    let { topic, value } = this
    if (typeof value === 'function') value = null
    return '{"' + topic + '":' + CircularJSON.stringify(value) + '}'
  }

  get key()   { return this.topic }
  get value() { return this[this.length - 1] }
  get accepted() {
    for (let x of this.tags.values()) {
      if (x) return true
    }
    return false
  }
}

module.exports = Stimulus
