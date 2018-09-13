'use strict';

const debug = require('debug')('kos:neural:network')
const Layer = require('./layer')
const Node  = require('./node')

class Network extends Layer {
  
  get [Symbol.toStringTag]() { return `Network:${this.id}` }
  get type() { return Symbol.for('kos:neural:network') }

  get nodes()  { return super.nodes.filter(n => n instanceof Node) }
  get layers() { return super.nodes.filter(n => n instanceof Layer) }

  get inputs()  { return this.nodes.filter(n => n.role === Node.INPUT) }
  get hiddens() { return this.nodes.filter(n => n.role === Node.HIDDEN) }
  get outputs() { return this.nodes.filter(n => n.role === Node.OUTPUT) }
  get orphans() { return this.nodes.filter(n => n.role === Node.ORPHAN) }

  // Relationships
  add(node) {
    if (super.add(node)) {
      if (node instanceof Layer) this.chain(node)
      else if (node instanceof Node) {
        for (let n of super.nodes) n.chain(node)
        this.source && this.source.chain(node)
      }
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Link) this.unchain(node)
      else if (node instanceof Node) {
        for (let n of super.nodes) n.unchain(node)
        this.source && this.source.unchain(node)
      }
      this[kConsumes] = undefined
      this[kProduces] = undefined
      return true
    }
    return false
  }
  chain(node) {
    if (this === node) return this
    for (let n of this.nodes) node.chain(n)
    return this
  }
  unchain(node) {
    if (this === node) return this
    for (let n of this.nodes) node.unchain(n)
    return this
  }
  
  inspect() {
    const { id, type, inputs, hiddens, outputs, orphans, nodes, layers } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, layers }
  }
}

module.exports = Network
