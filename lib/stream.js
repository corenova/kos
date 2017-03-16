'use strict';

try { var debug = require('debug')('kos:stream') }
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
      label, summary, requires=[], imports=[], subflows=[], reactors=[]
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
      consumes: new KineticTrigger,
      produces: new KineticTrigger,
      absorbs:  new KineticTrigger
    })

    // CORE ESSENCE (should it be a separate function?)
    this.core = new KineticEssence({
      transform: (ko, enc, callback) => {
        if (!ko) return callback()

        let [ consumes, produces, absorbs ] = this.state.get('consumes', 'produces', 'absorbs')
        if (this.seen(ko)) { 
          // from external flow
          // 1. handle 'kos' import (if defined)
          // 2. ignore keys not part of inputs
          if (ko.key === 'kos' && this._imports.size) {
            let flow = ko.value
            if (this._imports.has(flow.label)) {
              debug(this.identity, '<<<', flow.label)
              this.import(flow)
            }
          }
          if (consumes.size && !consumes.has(ko.key)) {
            this.emit('reject', ko)
            return callback() // ignore
          }
          if (this.ready) {
            debug(this.identity, '<==', ko.key)
            this.emit('consume', ko)
          } else {
            debug(this.identity, '<++', ko.key)
            this.emit('queue', ko)
            this.debug("queue", ko.key)
          }
          // mark the KineticObject that it's been accepted into this flow
          this.mark(ko, true)
        } else { 
          // from internal flow
          if (!this.state.has('parent') && ko.key !== 'error') {
            this.emit(ko.key, ko.value)
          }
          if (!produces.has(ko.key) || absorbs.has(ko.key)) {
            debug(this.identity, '<->', ko.key)
            this.emit('absorb', ko)
            this.mark(ko) // prevent external propagation
          } else {
            debug(this.identity, '==>', ko.key)
            this.emit('produce', ko)
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
    this.import(...imports)

    this.state.set('ready', false)
    debug(this.identity, 'new', this.id)

    const self = this
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

      if (this.accept(ko)) this.core.resume()
      else this.core.pause()

      callback(null, ko)
    })
  }
  // used by primary transform to determine whether the CORE REACTOR should become active
  accept(ko) {
    if (this.ready) return true

    // update internal requires state
    if (this._requires.has(ko.key)) {
      this.state.set(ko.key, ko.value)
    }
    if (this.state.has(...this.requires)) {
      this.state.set('ready', true)
      this.info('ready')
      this.emit('ready', this)
      this.send('kos', this)
    }
    return this.ready
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
    for (const key of keys.filter(String)) {
      // special handling of 'module/xxx' requires
      if (/^module\//.test(key)) {
        let target = key.match(/^module\/(.+)$/, '$1')
        try { this.state.set(key, require(target[1])) }
        catch (e) { debug('unable to auto-load require', key) }
      }
      this._requires.add(key)
    }
    return this
  }

  import(...flows) {
    let transforms = this.state.get('transforms')
    for (let flow of flows.filter(Boolean)) {
      if (flow instanceof KineticObjectStream) {
        flow = new KineticObjectStream(flow).join(this)
        let exists = this._imports.get(flow.label)
        if (exists) {
          this.exclude(exists)
          //exists.core.pipe(flow.core)
        }
        this._imports.set(flow.label, flow)
        this.core.pipe(flow).pipe(this.core)
      } else {
        this._imports.set(flow)
      }
    }
    this.updateState() // update transforms
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
      //stream.end(x => stream.unpipe(this.core))
    }
    // update inputs/outputs
    this.updateState()
    return this
  }

  chain(...flows) {
    let tail = flows.reduce(((a, b) => a.pipe(b)), this)
    tail && tail.pipe(this)
    return this
  }

  updateState() {
    let consumes = [].concat(this.requires,
                           ...this.reactors.map(x => x.inputs),
                           ...this.subflows.map(x => x.consumes))
    let produces = [].concat('error', 'warn', 'info', 'debug',
                            ...this.reactors.map(x => x.outputs),
                            ...this.subflows.map(x => x.produces))
    let absorbs = []
    for (let [ k, flow ] of this._imports) {
      if (!flow) continue
      consumes.push(...flow.requires)
      absorbs.push(...flow.consumes)
    }

    this.state.set('consumes', new KineticTrigger(consumes))
    this.state.set('produces', new KineticTrigger(produces))
    this.state.set('absorbs', new KineticTrigger(absorbs))
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

  get ready() { return this.state.get('ready') }

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
  get subflows() { return Array.from(this._subflows) }
  get reactors() { return Array.from(this._reactors) }

  get imports()  { return Array.from(this._imports).map(([k,v]) => v || k) }

  get consumes() { return Array.from(this.state.get('consumes')) }
  get produces() { return Array.from(this.state.get('produces')) }
  get absorbs()  { return Array.from(this.state.get('absorbs')) }

  get inputs() {
    let keys = new KineticTrigger([].concat(...this.reactors.map(x => x.inputs)))
    return Array.from(keys)
  }
  get outputs() {
    let keys = new KineticTrigger([].concat(...this.reactors.map(x => x.outputs)))
    return Array.from(keys)
  }

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
