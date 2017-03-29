'use strict';

try { var debug = require('debug')('kos:reactor') }
catch (e) { var debug = () => {} }

const KineticStream  = require('./stream')
const KineticObject  = require('./object')
const KineticTrigger = require('./trigger')

var KINETIC_MAX_LISTENERS = 30

class KineticReactor extends KineticStream {

  get [Symbol.toStringTag]() { return 'KineticReactor'+':'+this.label }

  constructor(options, description='') {
    if (options instanceof KineticReactor) {
      options = options.inspect()
      debug(options.label, 'cloning')
    }
    if (typeof options === 'string') 
      options = { label: options, summary: description }

    if (!options.label) throw new Error("must supply 'label' to create a new KineticReactor")

    super(options)

    let { 
      label, summary, reactors=[], triggers=[], maxListeners=KINETIC_MAX_LISTENERS
    } = options

    this._label    = label
    this._summary  = summary
    this._reactors = new Map
    this._triggers = new Set

    // CORE REACTOR
    this.core = new KineticStream({
      maxListeners: maxListeners,
      transform: (ko, enc, callback) => {
        if (!ko) return callback()
        if (this.seen(ko)) { 
          // from external flow
          let { requires, inputs } = this
          if (ko.match(requires) || ko.match(inputs)) {
            debug(this.identity, '<==', ko.key)
            this.emit('consume', ko)
            // mark the KineticObject that it's been accepted into this flow
            this.mark(ko, true)
          } else {
            this.emit('reject', ko)
            return callback()
          }
        } else { 
          // from internal flow
          let { absorbs, outputs } = this
          outputs.push(...[ 'error', 'warn', 'info', 'debug' ])
          if (ko.match(absorbs)) {
            debug(this.identity, '<->', ko.key)
            this.emit('absorb', ko)
            this.mark(ko, true) // prevent external propagation
          } else if (ko.match(outputs)) {
            debug(this.identity, '==>', ko.key)
            this.emit('produce', ko)
          } else {
            debug(this.identity, '<--', ko.key)
            this.mark(ko) // prevent external propagataion
          }
          if (ko.key !== 'error') 
            this.emit(ko.key, ko.value)
        }
        callback(null, ko)
      }
    })
    this.pipe(this.core).pipe(this)

    this.addReactor(...reactors)
    this.addTrigger(...triggers)

    debug(this.identity, 'new', this.id)
  }

  // Convenience function for injecting KineticObject into Writable stream
  feed(key, ...values) {
    for (const value of values)
      this.write(new KineticObject(key, value))
    return this
  }

  addReactor(...reactors) {
    for (let reactor of reactors) {
      reactor = new KineticReactor(reactor).join(this)
      this._reactors.set(reactor.label, reactor)
      this.core.pipe(reactor).pipe(this.core)
    }
    return this
  }

  addTrigger(...triggers) {
    for (let trigger of triggers) {
      trigger = new KineticTrigger(trigger).join(this)
      this._triggers.add(trigger)
      this.core.pipe(trigger).pipe(this.core)
    }
    return this
  }

  chain(...streams) {
    for (const stream of streams) {
      if (!(stream instanceof KineticStream))
        throw new Error('must supply KineticStream to chain')
      if (stream instanceof KineticReactor) this.addReactor(stream)
      else if (stream instanceof KineticTrigger) this.addTrigger(stream)
      else this.core.pipe(stream).pipe(this.core)
    }
    return this
  }

  // chain(...streams) {
  //   let tail = streams.reduce(((a, b) => a.pipe(b)), this)
  //   tail && tail.pipe(this)
  //   return this
  // }

  // Entry point to define triggers handled by this KOS
  //
  // returns: new KineticReactor
  in(...keys)  { return this.trigger(keys) }

  // Primary method for expressing I/O bound KineticTrigger for KineticReactor
  // 
  // trigger('my/input','my/output').bind(fn)
  // trigger(['a','b','c'],'d').bind(fn) 
  // trigger('hello','world',fn) -- returns KineticReactor
  //
  // returns: a new KineticTrigger or current KineticReactor (if func supplied)
  trigger(inputs, outputs, func) {
    let trigger = new KineticTrigger({
      inputs:  inputs,
      outputs: outputs,
      handler: func
    })
    return func ? this.include(trigger) : trigger.join(this)
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get identity() {
    let parent = this.state.get('parent')
    return parent ? parent.identity+'/'+this.label : this.label
  }

  get type() { return Symbol.for('kinetic.reactor') }

  get label()    { return this._label }
  get summary()  { return this._summary }
  get triggers() { return Array.from(this._triggers) }
  get reactors() { return Array.from(this._reactors.values()) }

  get requires() { return extractUniqueKeys([].concat(this.triggers, this.reactors), 'requires') }
  get inputs()   { return extractUniqueKeys(this.triggers, 'inputs') }
  get outputs()  { return extractUniqueKeys(this.triggers, 'outputs') }
  get absorbs()  { return extractUniqueKeys(this.reactors, 'inputs') }

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      reactors: this.reactors.map(x => x.inspect()),
      triggers: this.triggers.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      reactors: this.reactors.map(x => x.toJSON()),
      triggers: this.triggers.map(x => x.toJSON())
    })
  }

}

module.exports = KineticReactor

function extractUniqueKeys(from=[], name='') {
  let keys = new Set([].concat(...from.map(x => x[name])))
  return Array.from(keys)
}

