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
  get role() { 
    if (this.inputs.size && this.outputs.size) 
      return Symbol.for('neuron:hidden')
    if (this.inputs.size)
      return Symbol.for('neuron:output')
    if (this.outputs.size)
      return Symbol.for('neuron:input') 
    return Symbol.for('neuron:orphan')
  }
  get source() { return this[kSource] }
  get root()   { return this.source ? this.source.root : this }

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

    try { chunk.tagged(this) || this.activate(chunk.tag(this)); done() }
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

  error(err, ...rest) {
    if (!(err instanceof Error))
      err = new Error([...arguments].join(' '))
    err.origin = this
    //this.send('error', err)
    return err
  }

  inspect() {
    const { id, type, role } = this
    return { 
      id, type, role
    }
  }
}

module.exports = Neuron
