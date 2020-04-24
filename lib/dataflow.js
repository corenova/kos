/**
 * @fileoverview Dataflow
 * @author sekur (Peter Lee)
 */
'use strict';

const debug = require('./debug').extend('dataflow');
const { Container, Property } = require('yang-js');
const { Writable, Readable, Duplex } = require('stream');

const kDataflow = Symbol.for('kos:dataflow');
const EMPTY = [null];

class Dataflow extends Container {

  static get EMPTY() { return EMPTY; }

  static wrap(node) {
    if (!(node instanceof Property))
      throw new Error('target node must be an instance of Yang.Property');

    return {
      objectMode: true,
      write(data, encoding, done) {
	debug(`${node.uri} <- ${data === EMPTY ? 'nil' : 'data'}`);
	if (data === EMPTY) data = null;
	try { node.merge(data); done(); }
	catch (e) { done(e); } 
      },
      read(size) {
	if (node.state.flowing) return;
	node.on('change', () => {
	  debug(`${node.uri} -> ${node.active ? 'data' : 'nil'}`);
	  node.active ? this.push(node.get()) : this.push(EMPTY);
	});
	node.active && this.push(node.get());
	node.state.flowing = true;
	// TODO: support backpressure when this.push returns false
      },
    };    
  }
  
  static io(node, opts={}) {
    if (!(node instanceof Property))
      throw new Error('target node must be an instance of Yang.Property');

    const { mode = node.kind, override = false } = opts;
    let stream;
    if (kDataflow in node.state) {
      debug(`${node.uri} re-using existing dataflow stream`);
      stream = node.state[kDataflow];
    } else {
      if (!override && ['write', 'read', 'pipe'].some(k => (k in node)))
	throw new Error('target node has pre-existing (write/read/pipe) methods, consider { override: true }');

      const handler = this.wrap(node);
      switch (mode) {
      case 'input':
	stream = new Writable(handler); break;
      case 'output':
	stream = new Readable(handler); break;
      default:
	stream = new Duplex(handler); break;
      }
      node.state[kDataflow] = stream; // save it inside the node.state
    }
    return new Proxy(node, {
      get: (obj, key) => {
	if (override && ['write', 'read', 'pipe'].includes(key))
	  return key in stream ? stream[key].bind(stream) : undefined;
	if (key in obj) 
	  return obj[key];
	if (typeof stream[key] === 'function')
	  return stream[key].bind(stream);
	return stream[key];
      },
    });
  }
  
  get [Symbol.toStringTag]() { return `Dataflow:${this.uri}`; }
  get type() { return Symbol.for('kos:dataflow'); }
  
  constructor(spec) {
    super(spec);
    return Dataflow.io(this);
  }
  
  add(child) {
    // TODO: allow spec to denote whether to include leaf nodes to be iowrapped
    if (child instanceof Container) {
      debug(`${this.uri} += ${child.uri} (${child.kind}) using dataflow.io`);
      if (!(child instanceof Dataflow)) {
	// we set the child dataflow I/O behavior according to this nodes' mode
	child = Dataflow.io(child, { mode: this.kind });
      }
    } else {
      debug(`${this.uri} += ${child.uri} (${child.kind})`);
    }
    super.add(child);
  }

  remove(child) {
    // TODO: should do something about the stream?
    super.remove(child);
  }

  delete(opts={}) {
    if (!opts.actor) opts.actor = this;
    // XXX: override and bypass Container.delete since we shouldn't
    // clear children mapping and preserve the Dataflow proxy wrappers
    // TODO: revisit the delete/remove/clean/reset(?) lifecycle
    debug(`${this.uri} <> reset`);
    this.changes.clear();
    this.props.forEach(prop => prop.delete(opts));
    this.commit(this, opts);
    return this;
    //Property.prototype.delete.call(this, opts);
  }

  inspect() {
    return Object.assign(super.inspect(), {
      writable: this.kind !== 'output',
      readable: this.kind !== 'input',
      reading:  Boolean(this.state.flowing),
    });
  }
}

module.exports = Dataflow;
