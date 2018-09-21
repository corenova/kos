'use strict';

const debug = require('debug')('kos:persona')
const merge = require('deepmerge')

const Interface = require('./interface')

class Persona extends Interface {

  get [Symbol.toStringTag]() { return `Persona:${this.uri}` }
  get type() { return Symbol.for('kos:persona') }

  constructor(schema, state={}) {
    super(schema)
    this.model = schema(state)
    
    // // make Persona executable
    // let Kinetic = state => this.clone(state)
    // return Object.setPrototypeOf(Kinetic, this)
  }
  // TODO: fix this later...
  // clone(state={}) {
  //   return new this.constructor(this.schema, merge(this.state, state))
  // }
  incoming(pulse) {
    const { topic, schema, data } = pulse;
    const match = this.in(topic)
    if (match) {
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          prop.do(data)
            .catch(this.error.bind(prop))
          break;
        default:
          if (data)
            prop.merge(data, { force: true, suppress: true })
          else
            prop.remove()
        }
      }
    }
    return super.incoming(pulse)
  }
  join(parent) {
    if (!parent) throw this.error("must provide valid 'parent' argument")
    if (parent instanceof Persona) return super.join(parent)
    
    debug(`${this} join ${parent.constructor.name}`)
    const get = () => this
    get.bound = { content: this }
    Object.defineProperty(parent, this.datakey, { 
      get, enumerable: true
    })
    return parent
  }
}

module.exports = Persona

