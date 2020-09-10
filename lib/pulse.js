'use strict';

const debug = require('./debug').extend('pulse');
const delegate = require('delegates');
const { parse, stringify } = require('flatted');

const kTopic  = Symbol.for('kos:topic');
const kSchema = Symbol.for('kos:schema');
const kOrigin = Symbol.for('kos:origin');

const pulseModes = [ 'push', 'pull', 'sync' ];

class Pulse {

  static parse(str) {
    let [ label, obj ] = str.split(/\s+(.+)/)
    if (!label || !obj) throw new Error('invalid Pulse format, must specify both topic and payload')
    let [ topic, mode ] = label.split('|')
    return new Pulse(topic, this, mode).add(parse(obj))
  }
  
  get [Symbol.toStringTag]() { return `Pulse:${this.topic}{${this.size}}` }
  get key()     { return this.topic }
  get topic()   { return this[kTopic] }
  get schema()  { return this[kSchema] }
  get origin()  { return this[kOrigin] }
  
  set origin(x) { this[kOrigin] = x; this.tag(x) }
  set topic(x) {
    this[kTopic] = x;
    if (this.origin) {
      const { origin } = this;
      const match = (x[0] === '/') ? origin.locate(x) : origin.lookup('grouping', x);
      if (!match) throw new Error(`unable to find schema node for topic: ${x}`, origin);
      this[kSchema] = match
      // XXX -what if multiple matches???
      //this[kSchema] = match.length ? match[0].schema : match.schema
    }
  }

  constructor(topic, origin=null, mode='push') {
    this.tags = new Set;
    this.values = new Set;
    this.data = undefined;
    
    this.origin = origin; // must set this first
    this.topic = topic;
    this.mode = mode; // should validate mode string as one of (push, pull, sync)
    Object.preventExtensions(this);
  }
  add(...values) {
    const { topic, schema } = this
    if (schema) {
      // validate schema for each value
      // TODO: ignore schema validations schema.node for now...
      try { values = values.map(x => schema.node ? x : schema.apply(x)) }
      catch (e) {
        debug(e)
        throw new Error(`cannot validate ${topic} values to ${schema.uri}`)
      }
    }
    values.forEach(v => this.values.add(v))
    this.data = values[values.length - 1]
    return this
  }
  tag(x) { 
    !!x && this.tags.add(x)
    return this
  }
  tagged(x) {
    return this.tags.has(x)
  }
  toString(f=x=>x) {
    let { topic, mode, data } = this
    const values = []
    for (let value of this.values) {
      value = stringify(f(value))
      value && values.push(`${topic}|${mode} ${value}`)
    }
    if (!values.length) return ''
    return values.join("\n") + "\n"
  }
}

delegate(Pulse.prototype, kSchema)
  .getter('kind')
  .getter('node')

delegate(Pulse.prototype, 'values')
  .getter('size')
  .method('clear')
  .method('has')

module.exports = Pulse
