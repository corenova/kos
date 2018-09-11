'use strict';

const debug = require('debug')('kos:neural:network')
const Synapse = require('./synapse')
const Neuron  = require('./neuron')

class Network extends Synapse {
  
  get [Symbol.toStringTag]() { return 'Network' }
  get type() { return Symbol.for('kos:neural:network') }

  get nodes() { return this.elems.filter(el => el instanceof Neuron) }
  get links() { return this.elems.filter(el => el instanceof Synapse) }

  get inputs()  { return this.nodes.filter(n => n.role === Neuron.INPUT) }
  get hiddens() { return this.nodes.filter(n => n.role === Neuron.HIDDEN) }
  get outputs() { return this.nodes.filter(n => n.role === Neuron.OUTPUT) }
  get orphans() { return this.nodes.filter(n => n.role === Neuron.ORPHAN) }

  // Relationships
  add(elem) {
    if (super.add(elem)) {
      if (elem instanceof Synapse) this.chain(elem)
      else if (elem instanceof Neuron) {
        for (let el of this.elems) el.chain(elem)
        this.source && this.source.chain(elem)
      }
      this.scope = null
      return true
    }
    return false
  }
  remove(elem) {
    if (super.remove(elem)) {
      if (elem instanceof Synapse) this.unchain(elem)
      else if (elem instanceof Neuron) {
        for (let n of this.elems) n.unchain(elem)
        this.source && this.source.unchain(elem)
      }
      this.scope = null
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
    const { id, type, inputs, hiddens, outputs, orphans, links } = this
    return { id, type, inputs, hiddens, outputs, orphans, links }
  }
}

module.exports = Network
