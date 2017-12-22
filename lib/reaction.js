'use strict';

const debug = require('debug')('kos:reaction')
const delegate = require('delegates')

const State = require('./state')
const Context = require('./context')

class DynamicFunction extends Function {
  get [Symbol.toStringTag]() { return `Reaction:${this.label}` }
  constructor(f) {
    super()
    return Object.setPrototypeOf(f, Reaction.prototype)
  }
}

class Reaction extends DynamicFunction {
  
  static none() {}

  constructor(props={}, parent) {
    const reaction = stimulus => this.exec(stimulus)
    super(reaction)

    if (props instanceof Reaction) {
      props = props.inspect()
      delete props.id
    }

    let { 
      id, state,
      inputs = [], 
      outputs = [], 
      requires = [],
      handler = Reaction.none } = props

    this.state = (state instanceof State) ? state : new State(state)

    this.props({
      id, parent, inputs, outputs, requires
    })

    this.handler = handler
  }

  exec(stimulus) {
    if (stimulus.origin === this) 
      throw new Error(`circular loop detected in ${this.identity}`)

    if (this.ready(stimulus)) {
      let ctx = this.context
      let [ idx ] = stimulus.match(this.inputs)
      let args = this.inputs.map(this.get.bind(this))
      ctx.type = stimulus.key
      // TODO: clear the local state for input triggers?
      debug(this.identity, 'ƒ(' + this.inputs + ')', 'call', stimulus.length, 'time(s)')

      // Since stimulus may have multiple outputs generated, we collect
      // all "send" operations and "compress" them into bulk stimulus(s).
      for (let data of stimulus) {
        args[idx] = data
        try { this.handler.apply(ctx, args.concat(ctx)) }
        catch (e) { e.origin = this; debug(e); throw e; }
      }
      ctx.flush()
      return true
    }
    return false // always prevent propagation of the incoming stimulus
  }

  // RULE DEFINITION INTERFACE

  // a no-op continuation grammer for improving readability
  get and() { return this }

  // Bind a function to be triggered by the matching input key(s)
  // flowing into source KOS
  //
  // returns: source KOS
  bind(fn) {
    this.handler = fn
    debug(this.identity, '@', this.id)
    return this.reactor.persona
  }

  // END Of RULE DEFINITION INTERFACE
  push(stimulus) { this.reactor.write(stimulus) }

  //----------------------------------------------
  // Collection of Getters for inspecting Reaction
  //----------------------------------------------

  get type()     { return Symbol.for('kos:reaction') }

  get handler()  { return this._handler }
  set handler(fn) {
    if (typeof fn !== 'function') {
      try { fn = new Function(`return (${fn.source})`)() }
      catch (e) { throw new Error('unable to restore function from source', fn) }
      debug(this.identity, 'restored function from source')
    }
    this._handler = fn
    this.label = !!fn.name ? fn.name : 'anonymous'
    this.adapt(fn)
  }

  get reactor()  { return this.parent }
  get source()   { return this.handler.toString() }

  get context() {
    let ctx = Object.create(Context)
    ctx.reaction = this
    ctx.queue = new Map
    return ctx
  }

  get depends()  { 
    const regex = /^module\/(.+)$/
    return this.requires.filter(regex.test) 
  }

  inspect() {
    const { id, label, requires, inputs, outputs, handler } = this
    return {
      id, label, requires, inputs, outputs, handler 
    }
  }

  toJSON() {
    const { label, source } = this
    return Object.assign(this.inspect(), {
      handler: { label, source }
    })
  }
}

delegate(Reaction.prototype, 'state')
  .getter('id')
  .getter('label')
  .getter('identity')
  .getter('requires')
  .getter('inputs')
  .getter('outputs')
  .access('parent')
  .fluent('init')
  .fluent('props')
  .fluent('pre')
  .fluent('in')
  .fluent('out')
  .method('adapt')
  .method('ready')
  .method('has')
  .method('get')
  .method('set')
  .method('delete')
  .method('clear')

module.exports = Reaction

