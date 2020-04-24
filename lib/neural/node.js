'use strict';

const debug = require('./debug').extend('node');
const delegate = require('delegates');
const { Transform } = require('stream');
const { Port, Core } = require('./base');

const kIncoming = Symbol.for('neural:incoming');
const kExecutor = Symbol.for('neural:executor');
const kOutgoing = Symbol.for('neural:outgoing');

class Node {

  static get INPUT()  { return Symbol.for('node:input'); }
  static get HIDDEN() { return Symbol.for('node:hidden'); }
  static get OUTPUT() { return Symbol.for('node:output'); }
  static get ORPHAN() { return Symbol.for('node:orphan'); }

  get [Symbol.toStringTag]() { return `Node:${this.id}` }
  get type() { return Symbol.for('neural:node') }
  get role() {
    if (this.writers.size && (this.readers.size || !this.produces.size))
      return Node.HIDDEN
    if (this.writers.size) // only has nodes writing to this
      return Node.OUTPUT
    if (this.readers.size) // only has nodes reading from this
      return Node.INPUT
    return Node.ORPHAN
  }

  get istream() { return this[kIncoming]; }
  get xstream() { return this[kReacting]; }
  get ostream() { return this[kOutgoing]; }

  get requires() { return Array.from(this[kRequires].keys()); }
  get consumes() { return this.istream.topics; }
  get produces() { return this.ostream.topics; }
  
  get active() {
    return this.enabled && this.requires.every(x => !!x);
  }
  get ready() {
    return this.active && this.istream.active;
  }
  
  constructor(props={}) {
    const {
      id = uuid(),
      parent,
      activate,
      requires,
      consumes,
      produces,
      objectMode,
      highWaterMark,
      maxListeners,
    } = props;
    
    this.id = id;
    this.parent = parent;
    this.enabled = enabled;
    
    this[kIncoming] = new Port({ scope: consumes, objectMode, highWaterMark, maxListeners });
    this[kExecutor] = new Core({ scope: requires, });
    this[kOutgoing] = new Port({ scope: produces, objectMode, highWaterMark, maxListeners });
    
    this.istream.pipe(this.xstream)
    this.xstream.pipe(this.ostream)
    
    if (typeof activate === 'function')
      this.activate = activate.bind(this);
  }

  activate(chunk, done) { done(this.error("no activation function defined!")) }
  
  get active() {
    return this.enabled && Array.from(this.depends.values()).every(x => !!x);
  }
  get active() {
    return super.active && this.linked;
  }
  
  /* Peer/Unpeer Nodes

   Peering is used for creating dataflow pipelines.

   Between Neural Nodes, only compatible flows are piped to/from each
   other. For example, if Node A produces a topic that Node B
   consumes, a pipe between A -> B gets established. Similarly, if
   Node B produces a topic that Node A consumes, a pipe between B -> A
   gets established.

   The `peer` operation attempts to establish meaningful
   connection(s) between two Nodes.

   It is possible that two Nodes can form a closed-loop feedback
   relationship, although it is more common for closed-loop feedback
   to involve more Nodes.

   When an attempt is made to link two incompatible Nodes, no pipe
   gets established between the Nodes.

  */
  peer(node) {
    if (this === node) return this
    if (node instanceof Node) {
      this.pipe(node);
      node.pipe(this);
    } else throw this.error("Node can only peer with other Nodes");
    return this;
  }
  unpeer(node) {
    if (node instanceof Node) {
      this.unpipe(node);
      node.unpipe(this);
    } else throw this.error("Node can only peer with other Nodes");
    return this;
  }
  // Hierarchical Relationship
  add(node) {
    if (!this[kNodes].has(node)) {
      debug(`${this} add ${node}`)
      this[kNodes].add(node);
      return true;
    }
    return false;
  }
  remove(node) {
    if (this[kNova].has(node)) {
      debug(`${this} remove ${child}`);
      this[kNova].delete(node);
      return true;
    }
    return false;
  }
  attach(to) {
    if (this.parent !== to) {
      debug(`${this} attach ${to}`);
      if (to instanceof Node) to.add(this);
      else throw this.error("Node can only attach to another Node");
      this.parent = to;
    }
    return to;
  }
  detach() {
    const from = this.parent;
    debug(`${this} detach ${from}`)
    if (from instanceof Node) from.remove(this);
    this.parent = null;
    return this;
  }
  log(topic, ...args) {
    this.root.emit('log', topic, args, this);
  }
  error(err, ctx) {
    if (!(err instanceof Error))
      err = new Error(err);
    err.src = this;
    err.ctx = ctx;
    return err;
  }
  inspect() {
    const { id, type, active, ready, depends, consumes, produces } = this;
    return { 
      id, type, active, ready,
      depends: Array.from(depends.keys()),
      consumes: Array.from(consumes.keys()),
      produces: Array.from(produces.keys()),
    }
  }
  inspect() {
    const { depends, consumes, produces } = super.inspect();
    const { id, type, role, linked, active, ready } = this;
    return { 
      id, type, role, linked, active, ready,
      depends, consumes, produces,
    }
  }
}

delegate(Node.prototype, kIncoming)
  .get('writers')
  .method('write')

delegate(Node.prototype, kOutgoing)
  .get('readers')
  .method('read')
  .method('pipe')

module.exports = Node;
