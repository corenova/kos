'use strict';

const delegate = require('delegates')
const { parse, stringify } = require('circular-json')

class Pulse {

  get [Symbol.toStringTag]() { return `${this.topic}[${this.size}]` }

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must specify both topic and payload')
    let [ topic, origin ] = label.split('|')
    origin = this.find ? this.find(origin) : { id: origin }
    return new Pulse(topic, origin).add(parse(obj))
  }

  constructor(topic, origin=null) {
    this.topic  = topic
    this.origin = origin
    this.values = new Set
	this.tags = new Map
    if (origin) this.tag(origin.id)
  }

  add(...values) {
    values.forEach(val => this.values.add(val))
    this.value = values[values.length - 1]
    return this
  }

  tag(id, val) { 
	id && this.set(id, val) 
	return this
  }

  match(keys) {
    if (!arguments.length) return null
    if (arguments.length > 1) keys = arguments
    if (typeof keys === 'string') keys = [ keys ]
    //if (keys instanceof Set && keys.has(this.topic)) return true
    if ('*' in keys) return [ 0, keys[0] ]

    let idx = -1
    for (let key of keys) {
      idx++
      if (this.topic === key) return [ idx, key ]
      if (!key || key.indexOf('*') === -1) continue
      let regex = '^'+key.replace('*','.*')+'$'
      if (this.topic.match(regex) != null)
        return [ idx, key ]
    }
    return null
  }

  toKSON(f=x=>x) {
    let { topic, origin, data } = this
    let label = origin ? `${topic}|${origin.id}` : topic
    if (!f || !data) return null
    // XXX - hack for now
    if (this.match('module/*')) return null
    const values = []
    for (let value of this.values) {
      value = stringify(f(value))
      value && values.push(label+' '+value)
    }
    if (!values.length) return null
    return values.join("\n") + "\n"
  }

  get key()   { return this.topic }
  get data()  { return this.value }
  get accepted() {
    for (let x of this.tags.values()) {
      if (x === true) return true
    }
    return false
  }
  get dropped() {
    for (let x of this.tags.values()) {
      if (x === false) return true
    }
    return false
  }
}

delegate(Pulse.prototype, 'values')
  .getter('size')
  .method('clear')

delegate(Pulse.prototype, 'tags')
  .method('set')
  .method('get')
  .method('has')

module.exports = Pulse
