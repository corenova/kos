'use strict';

const debug = require('debug')('kos:pulse')
const delegate = require('delegates')
const { parse, stringify } = require('circular-json')

const { kTopic, kSchema, kSource } = require('./common')
const { Stimulus } = require('./neural')

class Pulse extends Stimulus {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must specify both topic and payload')
    let [ topic, source ] = label.split('|')
    source = this.find ? this.find(source) : { id: source }
    return new Pulse(topic, source).add(parse(obj))
  }
  
  get [Symbol.toStringTag]() { return `Pulse:${this.topic}[${this.size}]` }
  get key()     { return this.topic }
  get topic()   { return this[kTopic] }
  get schema()  { return this[kSchema] }
  set source(x) { this[kSource] = x }
  set topic(x) {
    const source = this[kSource]
    const match = (x[0] === '/') ? source.locate(x) : source.lookup('grouping', x)
    if (!match) throw new Error(`unable to find schema node for topic: ${x}`)
    this[kTopic]  = x
    this[kSchema] = match
    //this[kSchema] = match.length ? match[0].schema : match.schema
  }
  add(...values) {
    const { schema } = this
    // validate schema AND freeze each value
    values = values.map(x => Object.freeze(schema.apply(x)))
    return super.add(...values)
  }
  toKSON(f=x=>x) {
    let { topic, source, data } = this
    let label = source ? `${topic}|${source.id}` : topic
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

delegate(Pulse.prototype, kSchema)
  .method('apply')

module.exports = Pulse
