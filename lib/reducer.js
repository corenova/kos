'use strict';

const debug = require('debug')('kos:reducer')
const delegate = require('delegates')
const path = require('path');

const Reaction = require('./reaction')

const kState  = Symbol.for('kos:state')
const kSchema = Symbol.for('kos:schema')

class Reducer extends Reaction {

  get [Symbol.toStringTag]() { return `Reducer:${this.uri}` }
  get type()  { return Symbol.for('kos:reducer') }

  get context() {
    let ctx = super.context
    ctx.send = ctx.send.bind(ctx, 'kos:reduction')
    return ctx
  }
  get produces()  { return []  }
  set produces(x) { /* noop */ }
  
  push(pulse) {
    const { values } = pulse
    let value = values[values.length-1] // we only care about the latest
    this.parent && this.parent.save({ [this.name]: value })
  }
  inspect() {
    const { name, uri, depends, consumes } = this
    return Object.assign(super.inspect(), {
      name, uri, 
      depends:  Array.from(depends), 
      consumes: Array.from(consumes),
    })
  }
}

delegate(Reducer.prototype, kState)
  .method('get')
  .method('set')
  .method('has')
  .method('delete')

delegate(Reducer.prototype, kSchema)
  .getter('datapath')
  .getter('datakey')
  .getter('tag')
  .getter('kind')
  .getter('binding')
  .method('bind')
  .method('locate')
  .method('lookup')

module.exports = Reducer
