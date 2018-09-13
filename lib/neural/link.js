'use strict';

const debug = require('debug')('kos:neural:link')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')
//const isStream = require('is-stream')

const DEFAULT_HIGH_WATERMARK = 100

const kState = Symbol.for('kos:link:state');

class Link extends Duplex {

  get [Symbol.toStringTag]() { return `Link:${this.id}` }
  get type() { return Symbol.for('kos:neural:link') }
  get root() { return this.source ? this.source.root : this }
  
  get elements() { return Array.from(this[kState]) }

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

    this[kState] = new Set
  }
  // ADD/REMOVE
  //
  // adding or removing a node to the Link has the same effect as
  // placing a destination socket on the "right-side" of this Link.
  // Basically, everything received into the Link will be written
  // to the target node and everything read from the target node will
  // be sent out of this Link
  add(elem) {
    if (!this[kState].has(elem)) {
      debug(`${this} add ${elem}`)
      this.inflow.pipe(elem)
      elem.pipe(this.outflow)
      this[kState].add(elem)
      return true
    }
    return false
  }
  remove(elem) {
    if (this[kState].has(elem)) {
      debug(`${this} remove ${elem}`)
      this.inflow.unpipe(elem)
      elem.unpipe(this.outflow)
      this[kState].delete(elem)
      return true
    }
    return false
  }
  // 
  // Link Association
  //
  join(parent) {
    const { source } = this
    if (source === parent) return source
    debug(`${this} join ${parent}`)
    if (parent instanceof Link) parent.add(this)
    else throw this.error('Link can only join another Link')
    this.source = parent
    return parent
  }
  leave() {
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Link) source.remove(this)
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
    //this.send('error', err)
    return err
  }

  inspect() {
    const { id, type, elems } = this
    return { id, type, elems }
  }
}

module.exports = Link

