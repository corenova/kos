'use strict';

const debug = require('debug')('neural:link')
const uuid = require('uuid')
const { Duplex, PassThrough } = require('stream')
//const isStream = require('is-stream')

const DEFAULT_HIGH_WATERMARK = 100

const kParent  = Symbol.for('neural:parent')
const kNodes   = Symbol.for('neural:nodes');

class Link extends Duplex {

  get [Symbol.toStringTag]() { return `Link:${this.id}` }
  get type()    { return Symbol.for('neural:link') }
  get parent()  { return this[kParent] }
  get root()    { return this.parent ? this.parent.root : this }
  get nodes()   { return Array.from(this[kNodes]) }
  
  get consumers() { return this.nodes }
  get producers() { return this.nodes }

  get consumes() {
    if (!this[kNodes].consumes) {
      let consumes = this.consumers.map(n => Array.from(n.consumes))
      this[kNodes].consumes = new Map([].concat(...consumes))
    }
    return this[kNodes].consumes
  }
  get produces() {
    if (!this[kNodes].produces) {
      let produces = this.producers.map(n => Array.from(n.produces))
      this[kNodes].produces = new Map([].concat(...produces))
    }
    return this[kNodes].produces
  }

  constructor(props={}) {
    const {
      objectMode,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = props;

    super({ objectMode, highWaterMark });

    const {
      id, parent,
      inflow  = new PassThrough({ objectMode }),
      outflow = new PassThrough({ objectMode })
    } = props;

    this.id = id || uuid();
    this.inflow = inflow;
    this.outflow = outflow;

    this[kParent] = parent;
    this[kNodes] = new Set;

    this.inflow.on('log', this.log.bind(this));
    this.outflow.on('log', this.log.bind(this));
    
    const propagate = (pulse) => {
      if (!this.push(pulse)) this.outflow.pause()
    }
    this.outflow.on('data', propagate)
  }
  // Relationships
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this[kNodes].add(node)
      this[kNodes].consumes = undefined
      this[kNodes].produces = undefined
      this.connect(node)
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
      this.disconnect(node)
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
  // Link Association
  //
  attach(parent) {
    if (this[kParent] === parent) return parent
    debug(`${this} attach ${parent}`)
    if (parent instanceof Link) parent.add(this)
    else throw this.error('Link can only attach to another instanceof Link')
    this[kParent] = parent
    return parent
  }
  detach() {
    const { parent } = this
    debug(`${this} detach ${parent}`)
    if (parent instanceof Link) parent.remove(this)
    this[kParent] = null
  }
  //
  // Private Duplex implementation
  //
  _write(chunk, ...rest) {
    try { this.inflow.write(chunk, ...rest) }
    catch (e) { throw this.error(e) }
  }
  _read(size) { this.outflow.resume() }
  
  error(err, ctx) {
    if (!(err instanceof Error))
      err = new Error(err)
    err.src = this
    err.ctx = ctx
    return err
  }
  log(topic, ...args) {
    this.root.emit('log', topic, args, this);
  }
  inspect() {
    const { id, type, nodes } = this
    return { id, type, nodes }
  }
}

module.exports = Link

