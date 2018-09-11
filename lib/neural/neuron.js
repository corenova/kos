'use strict';

const debug = require('debug')('kos:neural:neuron')
const delegate = require('delegates')
const uuid = require('uuid')
const { Transform } = require('stream')

const Synapse = require('./synapse')
const Stimulus = require('./stimulus')

const DEFAULT_HIGH_WATERMARK = 100
const DEFAULT_MAX_LISTENERS = 30

class Neuron extends Transform {

  static get INPUT()  { return Symbol.for('neuron:input'); }
  static get HIDDEN() { return Symbol.for('neuron:hidden'); }
  static get OUTPUT() { return Symbol.for('neuron:output'); }
  static get ORPHAN() { return Symbol.for('neuron:orphan'); }

  get [Symbol.toStringTag]() { return `Neuron:${this.id}` }
  get type() { return Symbol.for('kos:neural:neuron') }
  get root() { return this.source ? this.source.root : this }
  get role() { 
    if (this.inputs.size && this.outputs.size) 
      return Neuron.HIDDEN
    if (this.inputs.size)
      return Neuron.OUTPUT
    if (this.outputs.size)
      return Neuron.INPUT
    return Neuron.ORPHAN
  }

  constructor(options={}) {
    const {
      activate,
      objectMode = true,
      highWaterMark = DEFAULT_HIGH_WATERMARK
    } = options

    super({ objectMode, highWaterMark })

    this.id = uuid()
    this.source = undefined
    this.inputs  = new Set // input Neurons
    this.outputs = new Set // output Neurons
    if (typeof activate === 'function')
      this.activate = activate.bind(this)
  }
  /* CONNECT/DISCONNECT

  */
  connect(node) {
    if (node instanceof Neuron) {
      if (!this.outputs.has(node)) {
        debug(`${this} connect ${node}`)
        this.pipe(node)
        this.outputs.add(node)
        node.inputs.add(this)
      }
    } else throw new Error("Neuron can only connect to another Neuron")
  }
  disconnect(node) {
    if (node instanceof Neuron) {
      if (this.outputs.has(node)) {
        this.unpipe(node)
        this.outputs.delete(node)
        node.inputs.delete(this)
      }
    } else throw new Error("Neuron can only disconnect another Neuron")
  }
  /* CHAIN/UNCHAIN

   Chaining is used for creating data pipelines.
  */
  chain(node) {
    if (this === node) return this
    if (node instanceof Neuron) {
      this.connect(node)
      node.connect(this)
    } else throw new Error("sorry, you can only chain Neurons")
    return this
  }
  unchain(node) {
    if (node instanceof Neuron) {
      this.disconnect(node)
      node.disconnect(this)
    } else throw new Error("sorry, you can only unchain Neurons")
    return this
  }
  join(parent) { 
    const { source } = this
    if (source === parent) return source
    debug(`${this} join ${parent}`)
    if (parent instanceof Synapse) parent.add(this)
    else throw new Error("Neuron can only join a Synapse")
    this.source = parent
    return parent
  }
  leave() { 
    const { source } = this
    debug(`${this} leave ${source}`)
    if (source instanceof Synapse) source.remove(this)
    this.source = null
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
