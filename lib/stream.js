'use strict';

try { var debug = require('debug')('kos/stream') }
catch (e) { var debug = () => {} }

const Transform = require('stream').Transform
const KineticAction = require('./action')
const KineticTransform = require('./transform')

class KineticObjectStream extends KineticTransform {

  constructor(options) {
    if (options instanceof KineticObjectStream) {
      options = options.inspect()
      debug(options.label, 'creating a new instance')
    }
    if (!options.label) 
      throw new Error("must supply 'label' to create a new KOS")

    super(options)

    let { 
      label, summary, requires=[], includes=[], imports=[], actions = [] 
    } = options

    requires = [].concat(requires).filter(Boolean)
    includes = [].concat(includes).filter(Boolean)
    imports  = [].concat(imports).filter(Boolean)
    actions  = [].concat(actions).filter(Boolean)

    this._label    = label
    this._summary  = summary
    this._requires = new Set(requires)
    this._includes = new Set
    this._imports  = new Set
    this._actions  = new Set

    const self = this

    // CORE TRANSFORM
    this.core = new Transform({
      objectMode: true,
      transform: function (ko, enc, callback) {
        if (ko.tags.has(self.id)) { 
          // from external stream
          let consumes = self.consumes
          if (consumes.has('*') || consumes.has(ko.key)) {
            debug(self.label, '<--', ko.key)
          } else {
            return callback() // ignore it
          }
        } else { 
          // from internal stream
          debug(self.label, '-->', ko.key)
          if (!self.parent || ko.key !== 'error')
            self.emit(ko.key, ko.value)
        }
        if (!this.push(ko))
          self.throw('dropped', ko.key)
        callback()
      }
    })

    this.pipe(this.core).pipe(this)

    this.use(...actions)
    this.include(...includes)
    this.import(...imports)

    function kinetic() {
      return new KineticObjectStream(self)
    }
    return Object.setPrototypeOf(kinetic, this)
  }

  // create a new Flow
  flow(name) {
    let flow = new KineticObjectStream({ label: name })
    this.use(flow)
    return flow
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

  require(...keys) {
    for (const key of keys.filter(Boolean)) this._requires.add(key)
    return this
  }

  include(...flows) {
    for (let flow of flows.filter(Boolean)) {
      if (!(flow instanceof KineticObjectStream))
        flow = new KineticObjectStream(flow)
      this._includes.add(flow)
      this.core.pipe(flow.join(this)).pipe(this.core)
    }
    return this
  }

  import(...flows) {
    for (const flow of flows.filter(Boolean)) {
      if (typeof flow === 'string') {
        // some logic to handle how it gets auto-registered
      }
    }
    return this
  }

  use(...actions) {
    for (let action of actions.filter(Boolean)) {
      if (!(action instanceof KineticAction))
        action = new KineticAction(action)
      if (!action.handler)
        throw new Error("[use] cannot use KineticAction without handler")
      if (this.state.has(action.handler))
        action.state = this.state.get(action.handler)
      else
        this.state.set(action.handler, action.state)
      this._actions.add(action)
      this.core.pipe(action.join(this)).pipe(this.core)
    }      
    return this
  }

  // Entry point to define actions handled by this KOS
  //
  // returns: new KineticAction
  in(...keys)  { return this.io(keys) }
  out(...keys) { return this.io(null, keys) }

  // Primary method for expressing I/O bound KineticAction for KOS
  // 
  // io('my/input','my/output').bind(fn)
  // io(['a','b','c'],'d').bind(fn) 
  // io('hello','world',fn) -- returns KOS
  //
  // returns: a new KineticAction or current KOS (if func supplied)
  io(inputs, outputs, func) {
    let action = new KineticAction({
      inputs:  inputs,
      outputs: outputs,
      handler: func
    })
    return func ? this.use(action) : action.join(this)
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get consumes() {
    let keys = [].concat(this.requires)
      .concat(...this.actions.map(x => x.inputs))
      .concat(...this.includes.map(x => Array.from(x.consumes)))
    return new Set(keys)
  }

  get provides() {
    let keys = [].concat(...this.actions.map(x => x.outputs))
    return new Set(keys)
  }

  get label()    { return this._label }
  get requires() { return Array.from(this._requires) }
  get includes() { return Array.from(this._includes) }
  get imports()  { return Array.from(this._imports) }
  get actions()  { return Array.from(this._actions) }

  inspect() {
    return Object.assign(super.inspect(), {
      label:    this._label,
      summary:  this._summary,
      requires: this.requires,
      includes: this.includes.map(x => x.inspect()),
      imports:  this.imports.map(x => x.inspect()),
      actions:  this.actions.map(x => x.inspect())
    })
  }
}

module.exports = KineticObjectStream
