'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const { Transform } = require('stream');

const Core = require('./core');
const Link = require('./link');

const kCore = Symbol.for('neural:core');

const DEFAULT_HIGH_WATERMARK = 100
// default value for maximum number of streams channels within the Stream
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const DEFAULT_MAX_LISTENERS = 50

class Node extends Transform {

  static get INPUT()  { return Symbol.for('node:input'); }
  static get HIDDEN() { return Symbol.for('node:hidden'); }
  static get OUTPUT() { return Symbol.for('node:output'); }
  static get ORPHAN() { return Symbol.for('node:orphan'); }

  get [Symbol.toStringTag]() { return `Node:${this.id}` }
  get type() { return Symbol.for('neural:node') }
  get core() { return this[kCore]; }
  get root() { return this.parent ? this.parent.root : this }
  get role() {
    if (this.inputs.size && (this.outputs.size || !this.produces.size))
      return Node.HIDDEN
    if (this.inputs.size)
      return Node.OUTPUT
    if (this.outputs.size)
      return Node.INPUT
    return Node.ORPHAN
  }

  constructor(props={}) {
    const {
      activate,
      objectMode = false,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners  = DEFAULT_MAX_LISTENERS,
    } = props

    super({ objectMode, highWaterMark })

    this[kCore] = new Core(props);
    this.inputs  = new Set // input Nodes
    this.outputs = new Set // output Nodes
    
    if (typeof activate === 'function')
      this.activate = activate.bind(this)
    maxListeners && this.setMaxListeners(maxListeners)
  }
  /* CONNECT/DISCONNECT

  */
  connect(node) {
    if (node instanceof Node) {
      if (!this.outputs.has(node) && this.isCompatible(node)) {
        debug(`${this} ===> ${node}`)
        this.pipe(node)
        this.outputs.add(node)
        node.inputs.add(this)
      }
    } else throw this.error("Node can only connect to another Node")
  }
  disconnect(node) {
    if (node instanceof Node) {
      if (this.outputs.has(node)) {
        this.unpipe(node)
        this.outputs.delete(node)
        node.inputs.delete(this)
      }
    } else throw this.error("Node can only disconnect another Node")
  }
  isCompatible(node) { 
    for (let [output] of this.produces)
      for (let [input] of node.consumes)
        if (output === input) return true
    return false 
  }
  /* LINK/UNLINK

   Linking is used for creating data pipelines.

   Between Neural Nodes, only compatible flows are piped to/from each
   other. For example, if Node A produces a topic that Node B
   consumes, a pipe between A -> B gets established. Similarly, if
   Node B produces a topic that Node A consumes, a pipe between B -> A
   gets established.

   The `link` operation attempts to establish meaningful
   connection(s) between two Nodes.

   It is possible that two Nodes can form a closed-loop feedback
   relationship, although it is more common for closed-loop feedback
   to involve more Nodes.

   When an attempt is made to link two incompatible Nodes, no pipe
   gets established between the Nodes.

  */
  link(node) {
    if (this === node) return this
    if (node instanceof Node) {
      this.connect(node)
      node.connect(this)
    } else throw this.error("Node can only link between Nodes")
    return this
  }
  unlink(node) {
    if (node instanceof Node) {
      this.disconnect(node)
      node.disconnect(this)
    } else throw this.error("Node can only unlink between Nodes")
    return this
  }
  // 
  // Link Association
  //
  attach(parent) { 
    if (this.parent === parent) return parent
    debug(`${this} attach ${parent}`)
    if (parent instanceof Link) parent.add(this)
    else throw this.error("Node can only attach to an instanceof Link")
    this.core.parent = parent
    return parent
  }
  detach() { 
    const { parent } = this
    debug(`${this} detach ${parent}`)
    if (parent instanceof Link) parent.remove(this)
    this.core.parent = null
  }
  
  activate(chunk, done) { done(this.error("no activation function defined for Node!")) }
  //
  // Transform Implementation
  // 
  _transform(chunk, encoding, done) {
    try { this.activate(chunk, done); }
    catch (e) {
      this.log('error', this.error(e));
      done();
    }
    return null;
  }
  error(err, ctx) {
    if (!(err instanceof Error))
      err = new Error(err);
    err.src = this;
    err.ctx = ctx;
    return err
  }
  log(topic, ...args) {
    this.root.emit('log', topic, args, this);
  }
  inspect() {
    const { id, type, role, active } = this
    return { 
      id, type, role, active
    }
  }
}

delegate(Node.prototype, kCore)
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

module.exports = Node
