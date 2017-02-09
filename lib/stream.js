'use strict';

const Transform = require('stream').Transform
const KineticAction = require('./action')
const KineticTransform = require('./transform')

const uuid = require('uuid')

class KineticObjectStream extends KineticTransform {

  static blackhole(chunk, enc, callback) { 
    callback() 
  }
  static passthrough(chunk, enc, callback) {
    this.state.set(chunk.key, chunk.value)
    callback(null, chunk.tag(this))
  }

  constructor(options={ actions: [], subflows: [], buffer: false}) {
    super(options)

    this._id = options.id || uuid()
    this._label = options.label
    this._summary = options.summary
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
      return new KineticObjectStream({
        ignores: self.ignores,
        subflows: self.subflows.map(x => x.inspect()),
        actions: self.actions.map(x => x.inspect())
      })
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

      if (ko.tags.size <= 1)
        if (!this.inflow.push(ko))
          this.throw('inflow full, rejecting input: '+ko.key)

      if (this.seen(ko)) {
        this.push(ko)
        this.emit(ko.key, ko.value)
      }
      callback()
    })
  }

  label(str) { this._label = str; return this }

  summary(desc) {  this._summary = desc; return this }

  seen(ko) { return ko.tags.has(this) }

  // Primary method for expressing I/O bound KineticAction
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

  // Alternative entry point to define actions handled by this KOS
  //
  // returns: new KineticAction
  in(...keys)  { return this.io(keys) }
  out(...keys) { return this.io(null, keys) }

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
      label: this._label,
      summary: this._summary,
      requires: this.requires,
      subflows: this.subflows,
      consumes: this.consumes,
      provides: this.provides,
      transforms: this.transforms,
      ignores: this.ignores,
      inputs: this.inputs,
      outputs: this.outputs,
      actions: this.actions
    }
  }
}

module.exports = KineticObjectStream
