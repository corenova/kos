'use strict';

const delegate = require('delegates')

class Stimulus {

  get [Symbol.toStringTag]() { return `Stimulus:${this.topic}[${this.size}]` }
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
    this.source = source
    this.topic = topic
    this.values = new Set
	this.tags = new Set
    this.tag(source)
  }
  add(...values) {
    values.forEach(val => this.values.add(val))
    this.data = values[values.length - 1]
    return this
  }
  tag(x) { 
	x && this.tags.add(x)
	return this
  }
  tagged(x) {
    return this.tags.has(x)
  }
}

delegate(Stimulus.prototype, 'values')
  .getter('size')
  .method('clear')
  .method('has')

module.exports = Stimulus
