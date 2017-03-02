'use strict';

try { var debug = require('debug')('kos/stream') }
catch (e) { var debug = () => {} }

const KineticEssence = require('./essence')
const KineticReactor = require('./reactor')
const KineticTrigger = require('./trigger')

class KineticObjectStream extends KineticEssence {

  constructor(options) {
    if (options instanceof KineticObjectStream) {
      options = options.inspect()
      debug(options.label, 'creating a new instance')
    }
    if (typeof options === 'string') options = { label: options }
    if (!options.label) throw new Error("must supply 'label' to create a new KOS")

    super(options)

    let { 
      label, summary, requires=[], imports=[], subflows=[], reactors=[], triggers=[]
    } = options

    requires = [].concat(requires).filter(String)
    imports  = [].concat(imports).filter(String)

    this._label    = label
    this._summary  = summary
    this._requires = new Set(requires)
    this._subflows = new Set
    this._reactors = new Set
    this._imports  = new Map

    this.default({
      inputs:  new KineticTrigger,
      outputs: new KineticTrigger
    })

    this.import(...imports)

    // CORE ESSENCE
    const main = this
    this.core = new KineticEssence({
      transform(ko, enc, callback) {
        if (!ko) return callback()

        let [ inputs, outputs ] = main.state.get('inputs', 'outputs')
        if (main.seen(ko)) { 
          // from external flow
          // 1. handle 'kos' import (if defined)
          // 2. ignore keys not part of inputs
          if (ko.key === 'kos' && main._imports.size) {
            let flow = ko.value
            if (main._imports.has(flow.label)) {
              debug(main.identity, '<<<', flow.label)
              let exists = main._imports.get(flow.label)
              if (exists) main.exclude(exists)
              flow = new KineticObjectStream(flow).join(main)
              this.pipe(flow).pipe(this)
              main._imports.set(flow.label, flow)
            }
          }
          if (!inputs.has(ko.key))
            return callback() // ignore
          debug(main.identity, '<==', ko.key)
        } else { 
          // from internal flow
          if (!main.state.has('parent') && ko.key !== 'error') {
            main.emit(ko.key, ko.value)
          }
          if (!inputs.has(ko.key) && !outputs.has(ko.key)) {
            debug(main.identity, '<->', ko.key)
            main.mark(ko) // prevent external propagation
          } else {
            debug(main.identity, '==>', ko.key)
          }
        }
        callback(null, ko)
      }
    })
    this.pipe(this.core).pipe(this)

    subflows = [].concat(subflows).filter(Boolean).map(x => {
      return x instanceof KineticObjectStream ? x : new KineticObjectStream(x)
    })
    reactors = [].concat(reactors).filter(Boolean).map(x => {
      return x instanceof KineticReactor ? x : new KineticReactor(x)
    })
    this.include(...subflows, ...reactors)

    this.state.set('ready', false)
    this.once('ready', x => this.send('kos', this))

    debug(this.identity, 'new', this.id)

    function kinetic() {
      return new KineticObjectStream(main)
    }
    return Object.setPrototypeOf(kinetic, this)
  }

  //--------------------------------------------------------
  // KOS Primary Transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
    super._transform(chunk, enc, (err, ko) => {
      if (err) return callback(err)
      if (!ko) return callback()

      if (this.ready(ko)) this.core.resume()
      else this.core.pause()

      callback(null, ko)
    })
  }
  // used by primary transform to determine whether the CORE REACTOR should become active
  ready(ko) {
    if (this.state.get('ready')) return true

    // update internal requires state
    if (this._requires.has(ko.key)) {
      this.state.set(ko.key, ko.value)
    }
    if (this.state.has(...this.requires)) {
      debug(this.identity, 'ready')
      this.state.set('ready', true)
      this.emit('ready', this)
    }
    return this.state.get('ready')
  }

  // set/get summary (fluent-style)
  summary(str) { 
    if (!!str) {
      this._summary = str
      return this
    } else {
      return this._summary
    }
  }

  // define pre-condition of required named objects
  //
  // until the required objects are seen by the stream, the CORE
  // REACTOR remains inactive
  require(...keys) {
    for (const key of keys.filter(String)) this._requires.add(key)
    return this
  }

  import(...flows) {
    for (const flow of flows.filter(Boolean)) {
      if (flow instanceof KineticObjectStream)
        this._imports.set(flow.label, flow)
      else
        // do something to register this need
        this._imports.set(flow)
    }
    return this
  }

  // general method of infusing the KOS with various streams
  include(...streams) {
    for (let stream of streams.filter(Boolean)) {
      switch (stream.type) {

      case 'KineticObjectStream': 
        this._subflows.add(stream)
        break;

      case 'KineticReactor': 
        if (this.state.has(stream.handler))
          stream.state = this.state.get(stream.handler)
        else
          this.state.set(stream.handler, stream.state)
        this._reactors.add(stream)
        break;

      default:
        throw new Error("[include] can only absorb an instance of KineticEssence")
      }
      this.core.pipe(stream.join(this)).pipe(this.core)
    }
    // update inputs/outputs
    this.updateState()
    return this
  }

  // general method of removing various streams from KOS
  exclude(...streams) {
    for (let stream of streams.filter(Boolean)) {
      switch (stream.type) {

      case 'KineticObjectStream': 
        this._subflows.delete(stream)
        break;

      case 'KineticReactor':
        this._reactors.delete(stream)
        break;

      default:
        throw new Error("[exclude] can only remove an instance of KineticEssence")
      }
      this.core.unpipe(stream)
      stream.end(x => stream.unpipe(this.core))
    }
    // update inputs/outputs
    this.updateState()
    return this
  }

  updateState() {
    let inputs = [].concat(this.requires,
                           ...this.reactors.map(x => x.inputs),
                           ...this.subflows.map(x => x.inputs))
    let outputs = [].concat(...this.reactors.map(x => x.outputs),
                            ...this.subflows.map(x => x.outputs))
    this.state.set('inputs',  new KineticTrigger(inputs))
    this.state.set('outputs', new KineticTrigger(outputs))
  }

  // Entry point to define reactors handled by this KOS
  //
  // returns: new KineticReactor
  in(...keys)  { return this.reactor(keys) }

  // Primary method for expressing I/O bound KineticReactor for KOS
  // 
  // reactor('my/input','my/output').bind(fn)
  // reactor(['a','b','c'],'d').bind(fn) 
  // reactor('hello','world',fn) -- returns KOS
  //
  // returns: a new KineticReactor or current KOS (if func supplied)
  reactor(inputs, outputs, func) {
    let reactor = new KineticReactor({
      inputs:  inputs,
      outputs: outputs,
      handler: func
    })
    return func ? this.include(reactor) : reactor.join(this)
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get intercepts() {
    let imports = Array.from(this._imports.values()).filter(Boolean)
    let keys = [].concat(...imports.map(x => x.inputs))
    return new Set(keys)
  }

  get identity() {
    let parent = this.state.get('parent')
    return parent ? parent.identity+'/'+this.label : this.label
  }

  get label()    { return this._label }
  get requires() { return Array.from(this._requires) }
  get imports()  { return Array.from(this._imports.keys()) }
  get subflows() { return Array.from(this._subflows) }
  get reactors() { return Array.from(this._reactors) }

  get inputs()  { return Array.from(this.state.get('inputs')) }
  get outputs() { return Array.from(this.state.get('outputs')) }

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      imports:  this.imports,
      subflows: this.subflows.map(x => x.inspect()),
      reactors: this.reactors.map(x => x.inspect())
    })
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      imports:  this.imports,
      subflows: this.subflows.map(x => x.toJSON()),
      reactors: this.reactors.map(x => x.toJSON())
    })
  }

}

module.exports = KineticObjectStream
