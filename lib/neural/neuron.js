'use strict';

const debug = require('debug')('kos:neuron')
const delegate = require('delegates')
const uuid = require('uuid')
const { Transform } = require('stream')

const Synapse = require('./synapse')
const Stimulus = require('./stimulus')

const kSource = Symbol.for('source')
const DEFAULT_HIGH_WATERMARK = 100
const DEFAULT_MAX_LISTENERS = 30

class Neuron extends Transform {

  get [Symbol.toStringTag]() { return `Neuron:${this.id}` }
  get type() { return Symbol.for('kos:neuron') }
  get status() { 
    if (this.inputs.size && this.outputs.size) 
      return Symbol.for('neuron:hidden')
    if (this.inputs.size)
      return Symbol.for('neuron:output')
    if (this.outputs.size)
      return Symbol.for('neuron:input') 
    return Symbol.for('neuron:orphan')
  }
  get source() { return this[kSource] }

  constructor(options={}) {
    const {
      activate,
      objectMode = true,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = options

    super({ objectMode, highWaterMark })

    this.id = uuid()
    this.inputs  = new Set // input Neurons
    this.outputs = new Set // output Neurons
    if (typeof activate === 'function')
      this.activate = activate.bind(this)
  }
  connect(neuron) {
    if (neuron instanceof Neuron) {
      if (!this.outputs.has(neuron)) {
        this.pipe(neuron)
        this.outputs.add(neuron)
        neuron.inputs.add(this)
      }
    } else throw new Error("Neuron can only connect to another Neuron")
  }
  disconnect(neuron) {
    if (neuron instanceof Neuron) {
      if (this.outputs.has(neuron)) {
        this.unpipe(neuron)
        this.outputs.delete(neuron)
        neuron.inputs.delete(this)
      }
    } else throw new Error("Neuron can only disconnect another Neuron")
  }
  join(parent) { 
    const { source } = this
    if (source === parent) return source
    debug(`${this} join ${parent}`)
    if (parent instanceof Synapse) parent.add(this)
    else throw new Error("Neuron can only join a Synapse")
    this[kSource] = parent
    return parent
  }
  leave() { 
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Synapse) source.remove(this)
    this[kSource] = null
  }
  activate(stimulus) { throw new Error("no activation function defined for Neuron!") }
  //
  // Transform Implementation
  // 
  _transform(chunk, encoding, done) {
    if (!(chunk instanceof Stimulus)) 
      throw new Error('Neuron can only operate on Stimulus')

    try { this.seen(chunk) || this.activate(this.mark(chunk)); done() }
    catch (e) {
      if (e.method === 'push') {
        this.read(0) // re-initiate reading from this stream
        this.once('data', () => {
          debug(this.id, "readable data has been read, resume next Neuron")
          done(null, e.chunk)
        })
      } else throw this.error(e)
    }
  }
  seen(stimulus) { return stimulus.has(this.id) }
  mark(stimulus) { return stimulus.tag(this.id) }
  //
  // Transform Overrides
  //
  push(chunk) {
    if (!super.push(...arguments) && chunk !== null) {
      let err = new Error(`unable to push chunk: ${chunk}`)
      err.origin = this
      err.method = 'push'
      err.chunk = chunk
      throw err
    }
    return true
  }
  inspect() {
    const { id, type, status } = this
    return { 
      id, type, status
    }
  }
}

module.exports = Neuron
