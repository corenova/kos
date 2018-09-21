'use strict';

const debug = require('debug')('kos:neural:layer')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')
//const isStream = require('is-stream')

const DEFAULT_HIGH_WATERMARK = 100

const kNodes = Symbol.for('neural:layer:nodes');

class Layer extends Duplex {

  get [Symbol.toStringTag]() { return `Layer:${this.id}` }
  get type()   { return Symbol.for('kos:neural:layer') }
  get root()   { return this.source ? this.source.root : this }
  get nodes()  { return Array.from(this[kNodes]) }
  get actors() { return this.nodes }

  get consumes() {
    if (!this[kNodes].consumes) {
      let consumes = this.actors.map(n => Array.from(n.consumes))
      this[kNodes].consumes = new Set([].concat(...consumes))
    }
    return this[kNodes].consumes
  }
  get produces() {
    if (!this[kNodes].produces) {
      let produces = this.actors.map(n => Array.from(n.produces))
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
    this.source = undefined
    this.inflow = inflow
    this.outflow = outflow

    this[kNodes] = new Set
  }
  // ADD/REMOVE
  //
  // adding or removing a node to the Layer has the same effect as
  // placing a destination socket on the "right-side" of this Layer.
  // Basically, everything received into the Layer will be written
  // to the target node and everything read from the target node will
  // be sent out of this Layer
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this.inflow.pipe(node)
      node.pipe(this.outflow)
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
      this.inflow.unpipe(node)
      node.unpipe(this.outflow)
      this[kNodes].delete(node)
      this[kNodes].consumes = undefined
      this[kNodes].produces = undefined
      return true
    }
    return false
  }
  // 
  // Layer Association
  //
  join(parent) {
    const { source } = this
    if (source === parent) return source
    debug(`${this} join ${parent}`)
    if (parent instanceof Layer) parent.add(this)
    else throw this.error('Layer can only join another Layer')
    this.source = parent
    return parent
  }
  leave() {
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Layer) source.remove(this)
    this.source = null
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

