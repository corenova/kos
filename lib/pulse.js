'use strict';

const debug = require('debug')('kos:pulse')
const delegate = require('delegates')
const { parse, stringify } = require('circular-json')

const { Stimulus } = require('./neural')
const kTopic  = Symbol.for('kos:pulse:topic')
const kSchema = Symbol.for('kos:pulse:schema')
const kOrigin = Symbol.for('kos:pulse:origin')

class Pulse extends Stimulus {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must specify both topic and payload')
    let [ topic, origin ] = label.split('|')
    origin = this.find ? this.find(origin) : { id: origin }
    return new Pulse(topic, origin).add(parse(obj))
  }
  
  get [Symbol.toStringTag]() { return `Pulse:${this.topic}[${this.size}]` }
  get key()     { return this.topic }
  get topic()   { return this[kTopic] }
  get schema()  { return this[kSchema] }
  get origin()  { return this[kOrigin] }
  
  set origin(x) { this[kOrigin] = x }
  set topic(x) {
    const { origin } = this
    const match = (x[0] === '/') ? origin.locate(x) : origin.lookup('grouping', x)
    if (!match) throw new Error(`unable to find schema node for topic: ${x}`)
    this[kTopic] = x
    this[kSchema] = match
    //this[SCHEMA] = match.length ? match[0].schema : match.schema
  }
  add(...values) {
    const { schema } = this
    // validate schema for each value
    values = values.map(x => schema.apply(x))
    return super.add(...values)
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
}

module.exports = Pulse
