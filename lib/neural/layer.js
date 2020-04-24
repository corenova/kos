'use strict';

const debug = require('./debug').extend('layer');
const Node = require('./node');
const Edge = require('./edge');

//
// Neural Layer
// can contain Nodes and Layers (hierarchical)
// can pipe to any stream instances
//
class Layer extends Node {

  get [Symbol.toStringTag]() { return `Layer:${this.id}` }
  get type() { return Symbol.for('neural:layer') }

  get nodes() { return this.cores.filter(n => n instanceof Node) }
  get edges() { return this.cores.filter(n => n instanceof Edge) }

  get inputs()  { return this.nodes.filter(n => n.role === Node.INPUT) }
  get hiddens() { return this.nodes.filter(n => n.role === Node.HIDDEN) }
  get outputs() { return this.nodes.filter(n => n.role === Node.OUTPUT) }
  get orphans() { return this.nodes.filter(n => n.role === Node.ORPHAN) }

  constructor(props={}) {
    const {
      objectMode = false,
      highWaterMark = DEFAULT_HIGH_WATERMARK,
      maxListeners  = DEFAULT_MAX_LISTENERS,
    } = props;

    super({ objectMode, highWaterMark });
    maxListeners && this.setMaxListeners(maxListeners);

    const {
      istream = new PassThrough({ objectMode }),
      ostream = new PassThrough({ objectMode })
    } = props;

    this[kCore] = new Core(props);
    this[kNodes] = new Set;
    
    this.istream = istream;
    this.ostream = ostream;

    const propagate = (pulse) => {
      if (!this.push(pulse)) this.ostream.pause()
    }
    this.istream.resume();
    this.ostream.on('data', propagate);
  }
  // Relationships
  add(child) {
    if (super.add(child)) {
      this.istream.pipe(child);
      child.pipe(this.ostream);
      
    }
    
    if (!this[kChildren].has(child)) {
      this.istream.pipe(child);
      child.pipe(this.ostream);
      this[kChildren].add(child);
      
      if (child instanceof Node) {
        for (let n of this.nodes) n.link(child);
        //this.parent && this.parent.link(node)
      }
    }
    if (super.add(child)) {
      if (node instanceof Layer) this.link(node)
      if (node instanceof Node) {
        for (let n of super.nodes) n.link(node)
        this.parent && this.parent.link(node)
      }
      return true
    }
    return false
  }
  remove(node) {
    if (super.remove(node)) {
      if (node instanceof Layer) this.unlink(node)
      if (node instanceof Node) {
        for (let n of super.nodes) n.unlink(node)
        this.parent && this.parent.unlink(node)
      }
      return true
    }
    return false
  }
  // LINK/UNLINK
  // Layers link to other nodes indirectly using their own collection of nodes
  link(node) {
    if (this === node) return this
    for (let n of this.nodes) node.link(n)
    return this
  }
  unlink(node) {
    if (this === node) return this
    for (let n of this.nodes) node.unlink(n)
    return this
  }
  inspect() {
    const { id, type, nodes, links } = this
    return { id, type, nodes, links }
  }
}

module.exports = Layer

