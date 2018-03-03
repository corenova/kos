'use strict';

const debug = require('debug')('kos:synapse')
const delegate = require('delegates')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')

const Stimulus = require('./stimulus')

const kSource = Symbol.for('source')
const kNodes  = Symbol.for('nodes')
const DEFAULT_HIGH_WATERMARK = 100

class Synapse extends Duplex {

  get [Symbol.toStringTag]() { return 'Synapse' }
  get type() { return Symbol.for('kos:synapse') }
  get source() { return this[kSource] }
  get nodes()  { return Array.from(this[kNodes]) }
  get input()  { return this.nodes.filter(node => node.status === Symbol.for('neuron:input')) }
  get hidden() { return this.nodes.filter(node => node.status === Symbol.for('neuron:hidden')) }
  get output() { return this.nodes.filter(node => node.status === Symbol.for('neuron:output')) }
  get orphan() { return this.nodes.filter(node => node.status === Symbol.for('neuron:orphan')) }

  constructor(options={}) {
    const {
      objectMode = true,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = options

    super({ objectMode, highWaterMark })

    this.id = uuid()
    this.inflow  = new PassThrough
    this.outflow = new PassThrough

    this[kNodes] = new Set
  }
  // ADD/REMOVE
  //
  // adding or removing a node to the Synapse has the same effect as
  // placing a destination socket on the "right-side" of this Synapse.
  // Basically, everything received into the Synapse will be written
  // to the target node and everything read from the target node will
  // be sent out of this Synapse
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this.inflow.pipe(node)
      node.pipe(this.outflow)
      this[kNodes].add(node)
      return true
    }
    return false
  }
  remove(node) {
    if (this[kNodes].has(node)) {
      debug(`${this} remove ${node}`)
      this.inflow.unpipe(node)
      node.unpipe(this.outflow)
      this[kNodes].delete(node)
      return true
    }
    return false
  }
  // 
  // Synapse Association
  //
  join(parent) {
    const { source } = this
    if (source === parent) return source
    debug(`${this} join ${parent}`)
    if (parent instanceof Synapse) parent.add(this)
    else throw new Error('Synapse can only join another Synpase')
    this[kSource] = parent
    return parent
  }
  leave() {
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Synapse) source.remove(this)
    this[kSource] = null
  }
  //
  // Private Duplex implementation
  //
  _write(chunk, ...rest) {
    if (chunk instanceof Stimulus) {
      this.incoming(chunk) && this.inflow.write(chunk, ...rest)
    }
    // TODO: handle if chunk isn't Pulse?
  }
  _read(size) {
    let stimulus
    while (null !== (stimulus = this.outflow.read(size))) {
      if (this.seen(stimulus)) continue
      if (!this.push(this.mark(stimulus))) break;
    }
  }
  incoming(chunk) { return true }
  outgoing(chunk) { return true }

  seen(stimulus) { return stimulus.has(this.id) }
  mark(stimulus) { return stimulus.tag(this.id) }

  inspect() {
    const { id, type, input, hidden, output, orphan } = this
    return { id, type, input, hidden, output, orphan }
  }
}

module.exports = Synapse

