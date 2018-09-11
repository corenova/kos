'use strict';

const debug = require('debug')('kos:neural:synapse')
const delegate = require('delegates')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')

const Stimulus = require('./stimulus')

const DEFAULT_HIGH_WATERMARK = 100

const kElems = Symbol.for('kos:synapse:elements');

class Synapse extends Duplex {

  get [Symbol.toStringTag]() { return `Synapse:${this.id}` }
  get type() { return Symbol.for('kos:neural:synapse') }
  get root() { return this.source ? this.source.root : this }

  get elems() { return Array.from(this[kElems]) }
  
  constructor(options={}) {
    const {
      objectMode = true,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = options

    super({ objectMode, highWaterMark })

    this.id = uuid()
    this.inflow  = new PassThrough({ objectMode })
    this.outflow = new PassThrough({ objectMode })

    this.source = undefined
    this[kElems] = new Set
  }
  // ADD/REMOVE
  //
  // adding or removing a node to the Synapse has the same effect as
  // placing a destination socket on the "right-side" of this Synapse.
  // Basically, everything received into the Synapse will be written
  // to the target node and everything read from the target node will
  // be sent out of this Synapse
  add(elem) {
    if (!this[kElems].has(elem)) {
      debug(`${this} add ${elem}`)
      this.inflow.pipe(elem)
      elem.pipe(this.outflow)
      this[kElems].add(elem)
      return true
    }
    return false
  }
  remove(elem) {
    if (this[kElems].has(elem)) {
      debug(`${this} remove ${elem}`)
      this.inflow.unpipe(elem)
      elem.unpipe(this.outflow)
      this[kElems].delete(elem)
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
    else throw this.error('Synapse can only join another Synpase')
    this.source = parent
    return parent
  }
  leave() {
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Synapse) source.remove(this)
    this.source = null
  }
  //
  // Private Duplex implementation
  //
  _write(chunk, ...rest) {
    if (!(chunk instanceof Stimulus))
      throw this.error('Synapse can only operate on Stimulus')
    
    try { this.incoming(chunk) && this.inflow.write(chunk, ...rest) }
    catch (e) {
      throw this.error(e)
    }
    // TODO: handle if chunk isn't Stimulus?
  }
  _read(size) {
    let stimulus
    while (null !== (stimulus = this.outflow.read(size))) {
      if (stimulus.tagged(this) || !this.outgoing(stimulus)) continue
      if (!this.push(stimulus.tag(this))) break;
    }
  }
  incoming(chunk) { return true }
  outgoing(chunk) { return true }

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

module.exports = Synapse

