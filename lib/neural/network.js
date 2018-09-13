'use strict';

const debug = require('debug')('kos:neural:network')
const Link = require('./link')
const Node = require('./node')

class Network extends Link {
  
  get [Symbol.toStringTag]() { return `Network:${this.id}` }
  get type() { return Symbol.for('kos:neural:network') }

  get nodes() { return this.elements.filter(el => el instanceof Node) }
  get links() { return this.elements.filter(el => el instanceof Link) }

  get inputs()  { return this.nodes.filter(n => n.role === Node.INPUT) }
  get hiddens() { return this.nodes.filter(n => n.role === Node.HIDDEN) }
  get outputs() { return this.nodes.filter(n => n.role === Node.OUTPUT) }
  get orphans() { return this.nodes.filter(n => n.role === Node.ORPHAN) }

  // Relationships
  add(elem) {
    if (super.add(elem)) {
      if (elem instanceof Link) this.chain(elem)
      else if (elem instanceof Node) {
        for (let el of this.elements) el.chain(elem)
        this.source && this.source.chain(elem)
      }
      return true
    }
    return false
  }
  remove(elem) {
    if (super.remove(elem)) {
      if (elem instanceof Link) this.unchain(elem)
      else if (elem instanceof Node) {
        for (let n of this.elements) n.unchain(elem)
        this.source && this.source.unchain(elem)
      }
      return true
    }
    return false
  }
  chain(elem) {
    if (this === elem) return this
    for (let n of this.nodes) elem.chain(n)
    return this
  }
  unchain(elem) {
    if (this === elem) return this
    for (let n of this.nodes) elem.unchain(n)
    return this
  }
  
  inspect() {
    const { id, type, inputs, hiddens, outputs, orphans, nodes, links } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, links }
  }
}

module.exports = Network
