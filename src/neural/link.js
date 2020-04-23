'use strict';

const debug = require('./debug').extend('link');
const delegate = require('delegates');
const { Duplex, PassThrough } = require('stream');
//const isStream = require('is-stream')

const Core = require('./core');

const kCore = Symbol.for('neural:core');
const kNodes = Symbol.for('neural:nodes');

const DEFAULT_HIGH_WATERMARK = 100
// default value for maximum number of streams channels within the Stream
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const DEFAULT_MAX_LISTENERS = 50

class Link extends Duplex {

  get [Symbol.toStringTag]() { return `Link:${this.id}` }
  get type()  { return Symbol.for('neural:link') }
  get core()  { return this[kCore]; }
  get root()  { return this.parent ? this.parent.root : this }
  get nodes() { return Array.from(this[kNodes]) }

  constructor(props={}) {
    const {
      objectMode = false,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners  = DEFAULT_MAX_LISTENERS,
    } = props;

    super({ objectMode, highWaterMark });

    const {
      inflow  = new PassThrough({ objectMode }),
      outflow = new PassThrough({ objectMode })
    } = props;

    this[kCore] = new Core(props);
    this[kNodes] = new Set;
    
    this.inflow = inflow;
    this.outflow = outflow;

    const propagate = (pulse) => {
      if (!this.push(pulse)) this.outflow.pause()
    }
    this.inflow.resume();
    this.outflow.on('data', propagate);
    maxListeners && this.setMaxListeners(maxListeners);
  }
  // Relationships
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this[kNodes].add(node)
      this.connect(node)
      return true
    }
    return false
  }
  remove(node) {
    if (this[kNodes].has(node)) {
      debug(`${this} remove ${node}`)
      this[kNodes].delete(node)
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
    if (this.parent === parent) return parent
    debug(`${this} attach ${parent}`)
    if (parent instanceof Link) parent.add(this)
    else throw this.error('Link can only attach to another instanceof Link')
    this.core.parent = parent
    return parent
  }
  detach() {
    const { parent } = this
    debug(`${this} detach ${parent}`)
    if (parent instanceof Link) parent.remove(this)
    this.core.parent = null
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

delegate(Link.prototype, kCore)
  .getter('id')
  .getter('parent')
  .getter('enabled')
  .getter('active')
  .getter('ready')
  .access('depends')
  .access('consumes')
  .access('produces')
  .method('enable')
  .method('disable')
  .method('update')

module.exports = Link

