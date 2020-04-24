'use strict';

const debug = require('./debug').extend('network');
const Link = require('./link')
const Node = require('./node')

class Network extends Link {
  
  get [Symbol.toStringTag]() { return `Network:${this.id}` }
  get type() { return Symbol.for('neural:network') }

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
      for (let n of this.nodes) n.link(node)
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      for (let n of this.node) n.unlink(node)
      return true
    }
    return false
  }
  inspect() {
    const { id, type, inputs, hiddens, outputs, orphans, nodes, links } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, links }
  }
}

module.exports = Network
