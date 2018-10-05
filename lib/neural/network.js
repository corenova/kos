'use strict';

const debug = require('debug')('neural:network')
const Link = require('./link')

class Network extends Link {
  
  get [Symbol.toStringTag]() { return `Network:${this.id}` }
  get type() { return Symbol.for('neural:network') }

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
    const { id, type, inputs, hiddens, outputs, orphans, nodes, layers } = this
    return { id, type, inputs, hiddens, outputs, orphans, nodes, layers }
  }
}

module.exports = Network
