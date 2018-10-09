'use strict';

const debug = require('debug')('neural:layer')

const Link = require('./link')
const Node = require('./node')

const DEFAULT_HIGH_WATERMARK = 100
//
// Neural Layers are composed together with other Layers, forming a
// hierarchical tree structure.
//
class Layer extends Link {

  get [Symbol.toStringTag]() { return `Layer:${this.id}` }
  get type()   { return Symbol.for('neural:layer') }

  get nodes()  { return super.nodes.filter(n => n instanceof Node) }
  get links()  { return super.nodes.filter(n => n instanceof Link) }

  get inputs()  { return this.nodes.filter(n => n.role === Node.INPUT) }
  get hiddens() { return this.nodes.filter(n => n.role === Node.HIDDEN) }
  get outputs() { return this.nodes.filter(n => n.role === Node.OUTPUT) }
  get orphans() { return this.nodes.filter(n => n.role === Node.ORPHAN) }
  
  // Relationships
  add(node) {
    if (super.add(node)) {
      if (node instanceof Layer) this.link(node)
      if (node instanceof Node) {
        for (let n of super.nodes) n.link(node)
        this.parent && this.parent.link(node)
      }
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Layer) this.unlink(node)
      if (node instanceof Node) {
        for (let n of super.nodes) n.unlink(node)
        this.parent && this.parent.unlink(node)
      }
      return true
    }
    return false
  }
  // LINK/UNLINK
  // Layers link to other nodes indirectly using their own collection of nodes
  link(node) {
    if (this === node) return this
    for (let n of this.nodes) node.link(n)
    return this
  }
  unlink(node) {
    if (this === node) return this
    for (let n of this.nodes) node.unlink(n)
    return this
  }
  inspect() {
    const { id, type, inputs, hiddens, outputs, orphans, nodes, links } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, links }
  }
}

module.exports = Layer

