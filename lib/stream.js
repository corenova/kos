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
	callback(null, chunk.tag(this))
  }

  constructor(options={ requires: [], actions: [], buffer: false}) {
    super(options)

	this._id = options.id || uuid()
	this._label = options.label
	this._summary = options.summary
	this._requires = new Set(options.requires)
    this._actions = new Set()

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
	  this.inject(action)
	}

	let self = this
	function kinetic() {
	  return new KineticObjectStream({
		ignores: self.ignores,
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
	  if (ko != null) {
		this.inflow.push(chunk)
		if (this.seen(chunk)) {
		  this.push(chunk)
		  this.emit(chunk.key, chunk.value)
		}
	  }
	  callback()
	})
  }

  label(str) { this._label = str; return this }

  summary(desc) {  this._summary = desc; return this }

  seen(ko) { return ko.tags.has(this) }

  require(...keys) {
	for (let key of keys) this._requires.add(key)
    return this
  }

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
	this.inject(action)
    return func ? this : action
  }

  // Alternative entry point to define actions handled by this KOS
  //
  // returns: new KineticAction
  in(...keys)  { return this.io(keys) }
  out(...keys) { return this.io(null, keys) }

  inject(action) {
    if (!(action instanceof KineticAction))
	  action = new KineticAction(action)
	if (!this._actions.has(action)) {
	  action.join(this)
      this._actions.add(action)
      this.inflow.pipe(action).pipe(this.outflow)
	}
    return this
  }

  // Convenience function for piping external stream into this stream
  //
  // returns: this KOS (chainable)
  pull(stream) { return stream.pipe(this) }

  //---------------------------------------------
  // Collection of Getters for inspecting KOS 
  //---------------------------------------------

  get requires() { return Array.from(this._requires) }

  get actions() { return Array.from(this._actions) }

  // collection of ALL consumed inputs
  get inputs() {
	let keys = new Set()
	for (let action of this.actions) {
	  for (let key of action.inputs) 
		keys.add(key)
	}
	return Array.from(keys)
  }
  // collection of ALL produced outputs
  get outputs() {
	let keys = new Set()
	for (let action of this.actions) {
	  for (let key of action.outputs) 
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
