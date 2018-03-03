'use strict';

const delegate = require('delegates')
const kSource = Symbol.for('source')

class Stimulus {

  get [Symbol.toStringTag]() { return `Stimulus:${this.topic}[${this.size}]` }
  get data() { 
    return this.value 
  }
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
  constructor(topic, source=null) {
    this[kSource] = source
    this.topic = topic
    this.values = new Set
	this.tags = new Map
    if (source) this.tag(source.id)
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
}

delegate(Stimulus.prototype, 'values')
  .getter('size')
  .method('clear')

delegate(Stimulus.prototype, 'tags')
  .method('set')
  .method('get')
  .method('has')

module.exports = Stimulus
