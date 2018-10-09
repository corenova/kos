'use strict';

const debug = require('debug')('neural:node')
const uuid = require('uuid')
const { Transform } = require('stream')

const Link = require('./link')

const kParent   = Symbol.for('neural:parent')
const kConsumes = Symbol.for('neural:consumes')
const kProduces = Symbol.for('neural:produces')

const DEFAULT_HIGH_WATERMARK = 100
// default value for maximum number of streams channels within the Stream
// NOTE: this is not a hard limit, but a warning will be generated if exceeded
const DEFAULT_MAX_LISTENERS = 30

class Node extends Transform {

  static get INPUT()  { return Symbol.for('node:input'); }
  static get HIDDEN() { return Symbol.for('node:hidden'); }
  static get OUTPUT() { return Symbol.for('node:output'); }
  static get ORPHAN() { return Symbol.for('node:orphan'); }

  get [Symbol.toStringTag]() { return `Node:${this.id}` }
  get type() { return Symbol.for('neural:node') }
  get parent() { return this[kParent] }
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

  get consumes() { return this[kConsumes] }
  get produces() { return this[kProduces] }
  set consumes(x=[]) { this[kConsumes] = new Set([].concat(x)) }
  set produces(x=[]) { this[kProduces] = new Set([].concat(x)) }
  
  constructor(props={}) {
    const {
      id = uuid(),
      activate,
      consumes,
      produces,
      objectMode,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners  = DEFAULT_MAX_LISTENERS
    } = props

    super({ objectMode, highWaterMark })

    this.id = id
    this.inputs  = new Set // input Nodes
    this.outputs = new Set // output Nodes
    this.consumes = consumes
    this.produces = produces
    
    if (typeof activate === 'function')
      this.activate = activate.bind(this)
    maxListeners && this.setMaxListeners(maxListeners)

    this[kParent] = undefined
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
    for (let output of this.produces)
      for (let input of node.consumes)
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
  join(parent) { 
    if (this[kParent] === parent) return parent
    debug(`${this} join ${parent}`)
    if (parent instanceof Link) parent.add(this)
    else throw this.error("Node can only join an instanceof Link")
    this[kParent] = parent
    return parent
  }
  leave() { 
    const { parent } = this
    debug(`${this} leave ${parent}`)
    if (parent instanceof Link) parent.remove(this)
    this[kParent] = null
  }
  
  activate(chunk, done) { done(this.error("no activation function defined for Node!")) }
  //
  // Transform Implementation
  // 
  _transform(chunk, encoding, done) {
    try { this.activate(chunk, done) }
    catch (e) {
      if (e.method === 'push') {
        this.read(0) // re-initiate reading from this stream
        this.once('data', () => {
          debug(this.id, "readable data has been read, resume next Node")
          done(null, e.chunk)
        })
      } else {
        debug(e)
        this.error(e)
      }
    }
  }
  //
  // Transform Overrides
  //
  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = this.error(`unable to push chunk: ${chunk}`)
      err.method = 'push'
      err.chunk = chunk
      throw err
    }
    return true
  }
  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([...arguments].join(' '))
    err.origin = this
    this.root.emit('error', err)
    return err
  }
  inspect() {
    const { id, type, role } = this
    return { 
      id, type, role
    }
  }
}

module.exports = Node
