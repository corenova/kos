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

  // ADD/REMOVE
  //
  // adding or removing a node to the Network has the same effect as
  // placing a destination socket on the "right-side" of this Network.
  // Basically, everything received into the Network will be written
  // to the target node and everything read from the target node will
  // be sent out of this Network
  add(node) {
    if (super.add(node)) {
      if (node instanceof Layer) this.link(node)
      else if (node instanceof Node) {
        for (let n of super.nodes) n.link(node)
        this.parent && this.parent.link(node)
      }
      this.connect(node)
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Link) this.unlink(node)
      else if (node instanceof Node) {
        for (let n of super.nodes) n.unlink(node)
        this.parent && this.parent.unlink(node)
      }
      this.disconnect(node)
      return true
    }
    return false
  }
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
    const { id, type, inputs, hiddens, outputs, orphans, nodes, layers } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, layers }
  }
}

module.exports = Network
