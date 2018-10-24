'use strict';

const debug = require('debug')('kos:pulse')
const delegate = require('delegates')
const { parse, stringify } = require('circular-json')

const kTopic  = Symbol.for('kos:topic')
const kSchema = Symbol.for('kos:schema')
const kOrigin = Symbol.for('kos:origin')
const kStatus = Symbol.for('kos:status')

class Pulse {

  static parse(str) {
    let [ label, obj ] = str.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid Pulse format, must specify both topic and payload')
    let [ topic, origin ] = label.split('|')
    origin = this.find ? this.find(origin) : this
    return new Pulse(topic, origin).add(parse(obj))
  }
  
  get [Symbol.toStringTag]() { return `Pulse:${this.topic}[${this.size}]` }
  get key()     { return this.topic }
  get topic()   { return this[kTopic] }
  get schema()  { return this[kSchema] }
  get origin()  { return this[kOrigin] }
  get pending() { return this[kStatus] !== true }
  
  set origin(x) { this[kOrigin] = x; this.tag(x) }
  set topic(x) {
    const { origin } = this
    const match = (x[0] === '/') ? origin.locate(x) : origin.lookup('grouping', x)
    if (!match) throw new Error(`unable to find schema node for topic: ${x}`)
    this[kTopic] = x
    this[kSchema] = match
    //this[kSchema] = match.length ? match[0].schema : match.schema
  }

  constructor(topic, origin=null) {
	this.tags = new Set
    this.values = new Set
    this.data = undefined
    
    this.origin = origin
    this.topic = topic
    this[kStatus] = false
    Object.preventExtensions(this)
  }
  add(...values) {
    const { topic, schema } = this
    // validate schema for each value
    // TODO: ignore schema validations for now...
    try { values = values.map(x => schema.node ? x : schema.apply(x)) }
    catch (e) {
      debug(e)
      throw new Error(`cannot validate ${topic} values to ${schema.trail}`)
    }
    values.forEach(v => this.values.add(v))
    this.data = values[values.length - 1]
    return this
  }
  tag(x, absorbed=false) { 
	x && this.tags.add(x)
    if (absorbed) this[kStatus] = true
	return this
  }
  tagged(x) {
    return this.tags.has(x)
  }
  toString(f=x=>x) {
    let { topic, origin, data } = this
    let label = origin ? `${topic}|${origin.id}` : topic
    if (!f || !data) return null
    const values = []
    for (let value of this.values) {
      value = stringify(f(value))
      value && values.push(label+' '+value)
    }
    if (!values.length) return null
    return values.join("\n") + "\n"
  }
}

delegate(Pulse.prototype, kSchema)
  .getter('kind')

delegate(Pulse.prototype, 'values')
  .getter('size')
  .method('clear')
  .method('has')

module.exports = Pulse
