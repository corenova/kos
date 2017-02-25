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
    this._imports  = new Set
    this._subflows = new Set
    this._reactors = new Set
    this._triggers = new Map

    this.import(...imports)

    const self = this
    // CORE REACTOR
    this.core = (new KineticReactor).bind(function (ko) {
      if (ko.tags.has(self.id)) { 
        // from external stream
        if (!self.consumes.has(ko.key)) return // ignore
        debug(self.label, '<--', ko.key)
      } else { 
        // from internal stream
        debug(self.label, '-->', ko.key)
        if (!self.parent || ko.key !== 'error')
          self.emit(ko.key, ko.value)
      }
      if (!this.push(ko))
        this.throw('dropped', ko.key)
    })
    this.pipe(this.core).pipe(this)

    subflows = [].concat(subflows).filter(Boolean).map(x => {
      return x instanceof KineticObjectStream ? x : new KineticObjectStream(x)
    })
    reactors = [].concat(reactors).filter(Boolean).map(x => {
      return x instanceof KineticReactor ? x : new KineticReactor(x)
    })
    triggers = [].concat(triggers).filter(Boolean).map(x => {
      return x instanceof KineticTrigger ? x : new KineticTrigger(x)
    })
    this.include(...subflows, ...reactors, ...triggers)

    function kinetic() {
      return new KineticObjectStream(self)
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
  // used by primary transform to determine whether the CORE REACTOR should be active
  ready(ko) {
    // update internal requires state
    if (this._requires.has(ko.key)) {
      this.state.set(ko.key, ko.value)
    }
    return this.requires.every(x => this.state.has(x))    
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
    for (const flow of flows.filter(String)) {
      // do something to register this need
      this._imports.add(flow)
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

      case 'KineticTrigger':
        
        break;

      default:
        throw new Error("[include] can only absorb an instance of KineticEssence")
      }
      this.core.pipe(stream.join(this)).pipe(this.core)
    }
    return this
  }

  // Entry point to define reactors handled by this KOS
  //
  // returns: new KineticReactor
  in(...keys)  { return this.reactor(keys) }
  out(...keys) { return this.reactor(null, keys) }

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

  flow(action) {
    let trigger = new KineticTrigger(action)
    return trigger.join(this)
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get consumes() {
    let keys = [].concat(this.requires)
      .concat(...this.reactors.map(x => x.inputs))
      .concat(...this.subflows.map(x => Array.from(x.consumes)))
    return new Set(keys)
  }

  get provides() {
    let keys = [].concat(...this.reactors.map(x => x.outputs))
    return new Set(keys)
  }

  get label()    { return this._label }
  get requires() { return Array.from(this._requires) }
  get imports()  { return Array.from(this._imports) }
  get subflows() { return Array.from(this._subflows) }
  get reactors() { return Array.from(this._reactors) }

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      subflows: this.subflows.map(x => x.inspect()),
      reactors: this.reactors.map(x => x.inspect())
    })
  }
}

module.exports = KineticObjectStream
