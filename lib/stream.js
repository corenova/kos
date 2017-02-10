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
  static passthrough(ko, enc, callback) {
    this.state.set(ko.key, ko.value)
    debug(this._info.label, '-->', ko.key)
    this.push(ko)
    if (ko.key !== 'error')
      this.emit(ko.key, ko.value)
    callback(null, ko) // see if internally chainable
  }

  constructor(options={ actions: [], subflows: [], buffer: false}) {
    if (options instanceof KineticObjectStream) {
      options = options.inspect()
      debug(options.label, 'creating a new instance')
    }
    delete options.inputs  // auto-computed
    delete options.outputs // auto-computed

    super(options)

    this._id = uuid()
    this._info = {
      label:   options.label,
      summary: options.summary
    }
    this._actions = new Map
    this._subflows = new Set

    // inflow (queue of to-be-processed kinetic objects)
    this.inflow  = new Transform({
      objectMode: true, 
      transform: KineticObjectStream.blackhole.bind(this)
    })
    // unless options.buffer is true, forces continues flow into blackhole
    if (!options.buffer)
      this.pipe(this.inflow)

    // outflow (queue of processed kinetic objects)
    //
    // tags processed chunks to be sent out the primary stream
    this.outflow = new Transform({
      objectMode: true,
      transform: KineticObjectStream.passthrough.bind(this)
    })
    this.outflow.pipe(this)

    for (let action of options.actions) {
      if (!(action instanceof KineticAction))
        action = new KineticAction(action)
      this.use(action)
    }
    for (let subflow of options.subflows) {
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

  //--------------------------------------------------------
  // KOS Primary Transform
  //--------------------------------------------------------
  _transform(chunk, enc, callback) {
    super._transform(chunk, enc, (err, ko) => {
      if (err != null) return callback(err)
      if (ko == null) return callback()

      if (this.ready(ko)) this.inflow.resume()
      else this.inflow.pause()

      if (!ko.tags.has(this.id)) { // never seen it before
        debug(this._info.label, '<--', ko.key)
        ko.tags.add(this.id)
        if (!this.inflow.push(ko))
          this.throw(this._info.label, 'rejecting', ko.key)
      }
      callback()
    })
  }

  // set/get label (fluent-style)
  label(str) { 
    if (!!str) {
      this._info.label = str
      return this
    } else {
      return this._info.label
    }
  }
  // set/get summary (fluent-style)
  summary(str) { 
    if (!!str) {
      this._info.summary = str
      return this
    } else {
      return this._info.summary
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
  io(input, output, func) {
    let action = new KineticAction({
      inputs: input,
      outputs: output,
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
      if (this._actions.has(transform.handler)) {
        // merging transform into existing one
        this._actions.get(transform.handler)
          .in(...transform.inputs)
          .out(...transform.outputs)
        return this
      }
      this._actions.set(transform.handler, transform)
    }
    if (transform instanceof KineticObjectStream) this._subflows.add(transform)
    this.inflow.pipe(transform.join(this)).pipe(this.outflow)
    return this
  }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get id() { return this._id }
  get subflows() { return Array.from(this._subflows) }
  get actions()  { return Array.from(this._actions.values()) }

  // collection of ALL consumed inputs (including requires)
  // TODO: find a way to cache this
  get inputs() {
    let keys = new Set(this.requires)
    for (let action of this.actions) {
      for (let key of action.inputs) 
        keys.add(key)
    }
    for (let subflow of this.subflows) {
      for (let key of subflow.inputs)
        keys.add(key)
    }
    return Array.from(keys)
  }
  // collection of ALL produced outputs
  // TODO: find a way to cache this
  get outputs() {
    let keys = new Set()
    for (let action of this.actions) {
      for (let key of action.outputs) 
        keys.add(key)
    }
    for (let subflow of this.subflows) {
      for (let key of subflow.outputs)
        keys.add(key)
    }
    return Array.from(keys)
  }
  // keys produced AND consumed within KOS
  get transforms() { 
    let { inputs, outputs } = this
    return inputs.filter(x => outputs.includes(x)) 
  }
  // keys that MUST be provided into KOS
  get consumes() { 
    let { inputs, transforms } = this
    return inputs.filter(x => !transforms.includes(x)) 
  }
  // keys that SHOULD be consumed from KOS
  get provides() { 
    let { outputs, transforms } = this
    return outputs.filter(x => !transforms.includes(x)) 
  }

  inspect() {
    return {
      id: this._id,
      label: this._info.label,
      summary: this._info.summary,
      requires: this.requires,
      consumes: this.consumes,
      provides: this.provides,
      transforms: this.transforms,
      ignores: this.ignores,
      inputs: this.inputs,
      outputs: this.outputs,
      actions: this.actions.map(x => x.inspect()),
      subflows: this.subflows.map(x => x.inspect())
    }
  }
}

module.exports = KineticObjectStream
