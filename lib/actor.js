'use strict';

const debug = require('debug')('kos:actor')

const Persona = require('./persona')
      
class Actor extends Persona {

  get [Symbol.toStringTag]() { return `Actor:${this.uri}` }
  get type()  { return Symbol.for('kos:actor') }
  get default() { return this }

  create(schema) {
    return new Persona(schema)
  }
  // join(parent) {
  //   if (!parent) throw this.error("must provide valid 'parent' argument")
  //   if (parent instanceof Actor) return super.join(parent)
    
  //   debug(`${this} join ${parent.constructor.name}`)
  //   const get = () => this
  //   get.bound = { content: this }
  //   Object.defineProperty(parent, this.datakey, { 
  //     get, enumerable: true
  //   })
  //   return parent
  // }
}

module.exports = Actor

