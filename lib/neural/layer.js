'use strict';

const debug = require('debug')('kos:neural:layer')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')
//const isStream = require('is-stream')

const DEFAULT_HIGH_WATERMARK = 100

const kParent = Symbol.for('neural:parent')
const kNodes  = Symbol.for('neural:nodes');

class Layer extends Duplex {

  get [Symbol.toStringTag]() { return `Layer:${this.id}` }
  get type()   { return Symbol.for('kos:neural:layer') }
  get parent() { return this[kParent] }
  get root()   { return this.parent ? this.parent.root : this }
  get nodes()  { return Array.from(this[kNodes]) }

  get consumes() {
    if (!this[kNodes].consumes) {
      let consumes = this.nodes.map(n => Array.from(n.consumes))
      this[kNodes].consumes = new Set([].concat(...consumes))
    }
    return this[kNodes].consumes
  }
  get produces() {
    if (!this[kNodes].produces) {
      let produces = this.nodes.map(n => Array.from(n.produces))
      this[kNodes].produces = new Set([].concat(...produces))
    }
    return this[kNodes].produces
  }
  
  constructor(props={}) {
    const {
      objectMode,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = props

    super({ objectMode, highWaterMark })

    const {
      id, 
      inflow  = new PassThrough({ objectMode }),
      outflow = new PassThrough({ objectMode })
    } = props

    this.id = id || uuid()
    this.inflow = inflow
    this.outflow = outflow

    this[kParent] = undefined
    this[kNodes] = new Set
  }
  // Relationships
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this[kNodes].add(node)
      this[kNodes].consumes = undefined
      this[kNodes].produces = undefined
      return true
    }
    return false
  }
  remove(node) {
    if (this[kNodes].has(node)) {
      debug(`${this} remove ${node}`)
      this[kNodes].delete(node)
      this[kNodes].consumes = undefined
      this[kNodes].produces = undefined
      return true
    }
    return false
  }
  connect(node) {
    this.inflow.pipe(node)
    node.pipe(this.outflow)
  }
  disconnect(node) {
    node.unpipe(this.outflow)
    this.inflow.unpipe(node)
  }
  // 
  // Layer Association
  //
  join(parent) {
    if (this[kParent] === parent) return parent
    debug(`${this} join ${parent}`)
    if (parent instanceof Layer) parent.add(this)
    else throw this.error('Layer can only join another instanceof Layer')
    this[kParent] = parent
    return parent
  }
  leave() {
    const { parent } = this
    debug(`${this} leave ${parent}`)
    if (parent instanceof Layer) parent.remove(this)
    this[kParent] = null
  }
  //
  // Private Duplex implementation
  //
  _write(chunk, ...rest) {
    try { this.inflow.write(chunk, ...rest) }
    catch (e) { throw this.error(e) }
  }
  _read(size) {
    let chunk
    while (null !== (chunk = this.outflow.read(size))) {
      if (!this.push(chunk)) break;
    }
  }
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([...arguments].join(' '))
    err.origin = this
    this.root.emit('error', err)
    return err
  }

  inspect() {
    const { id, type, nodes } = this
    return { id, type, nodes }
  }
}

module.exports = Layer

