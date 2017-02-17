'use strict';

try { var debug = require('debug')('kos/stream') }
catch (e) { var debug = () => {} }

const Transform = require('stream').Transform
const KineticAction = require('./action')
const KineticTransform = require('./transform')

const uuid = require('uuid')

class KineticObjectStream extends KineticTransform {

  static blackhole(chunk, enc, callback) { 
    callback() 
  }
  // NOTE: context (this) is the KOS instance
  static passthrough(ko, enc, callback) {
    //this.state.set(ko.key, ko.value) // do we need this?
    if (ko.key === 'error' || this.outputs.includes(ko.key)) {
      debug(this._info.label, '-->', ko.key)
      this.push(ko) // push into main KOS readable stream
      if (!this.parent || ko.key !== 'error')
        this.emit(ko.key, ko.value)
    }
    callback(null, ko) // see if internally chainable
  }

  constructor(options) {
    if (options instanceof KineticObjectStream) {
      options = options.inspect()
      debug(options.label, 'creating a new instance')
    }
    delete options.inputs  // auto-computed at the stream-level
    delete options.outputs // auto-computed at the stream-level

    if (!options.label) 
      throw new Error("must supply 'label' to create a new KOS")

    super(options)

    let { label, summary, actions = [], subflows = [], buffer = false } = options

    this._id       = uuid()
    this._label    = label
    this._summary  = summary
    this._actions  = new Set
    this._subflows = new Set

    // inflow (queue of to-be-processed kinetic objects)
    this.inflow  = new Transform({
      objectMode: true, 
      transform: KineticObjectStream.blackhole.bind(this)
    })
    // unless options.buffer is true, forces continues flow into blackhole
    if (!buffer)
      this.pipe(this.inflow)

    // outflow (queue of processed kinetic objects)
    //
    // tags processed chunks to be sent out the primary stream
    this.outflow = new Transform({
      objectMode: true,
      transform: KineticObjectStream.passthrough.bind(this)
    })
    this.outflow.pipe(this)

    for (let action of actions) {
      if (!(action instanceof KineticAction)) {
        action = new KineticAction(action)
      }
      this.use(action)
    }
    for (let subflow of subflows) {
      if (!(subflow instanceof KineticObjectStream))
        subflow = new KineticObjectStream(subflow)
      this.use(subflow)
    }

    let self = this
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
      if (ko) {
        if (this.ready) this.inflow.resume()
        else this.inflow.pause()
        
        if (!ko.tags.has(this.id)) { // never seen it before
          debug(this.label, '<--', ko.key)
          ko.tags.add(this.id)
          if (!this.inflow.push(ko))
            this.throw(this.label, 'rejecting', ko.key)
        }
      }
      callback()
    })
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

  use(transform) {
    if (!(transform instanceof KineticTransform))
      throw new Error("[use] must supply valid instance of KineticTransform")
    if (transform instanceof KineticAction) {
      if (!transform.handler)
        throw new Error("[use] cannot use KineticAction without handler")
      if (this.state.has(transform.handler))
        transform.state = this.state.get(transform.handler)
      else
        this.state.set(transform.handler, transform.state)
      this._actions.add(transform)
    }
    else if (transform instanceof KineticObjectStream) 
      this._subflows.add(transform)

    // setup the data pipeline
    this.inflow.pipe(transform.join(this)).pipe(this.outflow)
    return this
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get id()       { return this._id }
  get label()    { return this._label }
  get actions()  { return Array.from(this._actions) }
  get subflows() { return Array.from(this._subflows) }

  // TODO: should cache this...
  get inputs() {
    let keys = new Set(this.requires)
    for (const action of this.actions)
      for (const key of action.inputs)
        keys.add(key)
    // grab only requires from subflows
    for (const subflow of this.subflows)
      for (const key of subflow.requires)
        keys.add(key)
    return Array.from(keys)
  }
  // TODO: should cache this...
  get outputs() { 
    let keys = new Set
    for (let action of this.actions)
      for (let key of action.outputs) 
        keys.add(key)
    return Array.from(keys)
  }

  // keys produced AND consumed within KOS
  get transforms() { 
    //let { consumes, provides } = this
    //return consumes.filter(x => provides.includes(x))
  }

  inspect() {
    return {
      id:       this._id,
      label:    this._label,
      summary:  this._info.summary,
      requires: this.requires,
      inputs:   this.inputs,
      outputs:  this.outputs,
      transforms: this.transforms,
      actions:  this.actions.map(x => x.inspect()),
      subflows: this.subflows.map(x => x.inspect())
    }
  }
}

module.exports = KineticObjectStream
