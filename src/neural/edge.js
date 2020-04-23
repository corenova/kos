'use strict';

const debug = require('./debug').extend('edge');
const Core = require('./core');

class Edge extends Core {

  get [Symbol.toStringTag]() { return `Edge:${this.id}` }
  get type()  { return Symbol.for('neural:edge') }

  connect(from, to) {
    from.pipe(this).pipe(to);
  }
  disconnect(from, to) {
    from.unpipe(this);
    this.unpipe(to);
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

