'use strict';

const debug = require('debug')('kos:pulse')
const delegate = require('delegates')
const { parse, stringify } = require('circular-json')
const Yang = require('yang-js')

const { Stimulus } = require('./neural')
const kTopic  = Symbol.for('topic')
const kSchema = Symbol.for('schema')
const kSource = Symbol.for('source')

class Pulse extends Stimulus {

  static fromKSON(kson) {
    let [ label, obj ] = kson.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid KSON, must specify both topic and payload')
    let [ topic, source ] = label.split('|')
    source = this.find ? this.find(source) : { id: source }
    return new Pulse(topic, source).add(parse(obj))
  }

  get [Symbol.toStringTag]() { return `Pulse:${this.topic}[${this.size}]` }
  get key()    { return this.topic }
  get topic()  { return this[kTopic] }
  get schema() { return this[kSchema] }
  set topic(x) {
    const source = this[kSource]
    const match = source.in(x)
    if (!match) throw new Error(`unable to find data node for topic: ${x}`)
    this[kTopic]  = x
    this[kSchema] = match.length ? match[0].schema : match.schema
  }
  add(...values) {
    const schema = this[kSchema]
    // validate schema AND freeze each value
    values = values.map(x => Object.freeze(schema.apply(x)))
    return super.add(...values)
  }
  match(keys) {
    if (!arguments.length) return null
    if (arguments.length > 1) keys = arguments
    if (typeof keys === 'string') keys = [ keys ]
    //if (keys instanceof Set && keys.has(this.key)) return true
    if ('*' in keys) return [ 0, keys[0] ]

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
