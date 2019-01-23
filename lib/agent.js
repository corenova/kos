/**
 * @fileoverview Agent
 * @author saintkepha (Peter Lee)
 */

const debug = require('./debug').extend('agent');
const delegate = require('delegates');

const Store = require('yang-js').Store;
const Persona = require('./persona')
const Interface = require('./interface');
const kStore = Symbol.for('kos:store')

class Agent extends Interface {

  get [Symbol.toStringTag]() { return `Agent:${this.uri}`; }
  get type() { return Symbol.for('kos:agent'); }
  get default() { return this; }

  get schema() { return super.schema; }
  set schema(x) {
    this[kStore] = undefined;
    super.schema = x;
    const store = new Store(this.name).add(x);
    store
      .on('error', this.error.bind(this))
      .on('log',   this.emit.bind(this,'log'));
    this[kStore] = store;
  }
  get store() { return this[kStore]; }

  create(schema) {
    return new Agent(schema);
  }
  use(schema) {
    debug(`${this} using ${schema.tag} interface module`);
    this.store.add(schema);
    return new Interface(schema).join(this);
  }
  set() {
    this.store.set(...arguments);
    return this;
  }
  merge() {
    this.store.merge(...arguments);
    return this;
  }
  run(opts={}) {
    const { verbose=0, log=console } = opts;
    this.on('error', (err) => {
      const { ctx={} } = err;
      log.error(err);
    });
    this.on('log', (topic, args, ctx={}) => {
      if (verbose > 2) args.unshift(ctx.uri);
      log[topic](...args);
    })
    this.on('data', (pulse) => {
      if (verbose <= 3) return;
      if (log.trace) log.trace(`${pulse}`);
      else log.log(`${pulse}`);
    })
    return this.feed('kos:store', this.store);
  }
  enable(...uris) {
    if (uris[0] === '*') {
      this.interfaces.forEach(i => {
        i.personas.forEach(p => p.enable())
      })
      return this;
    }
    for (let uri of uris) {
      const match = this.at(uri)
      if (match) match.enable()
    }
    return this;
  }
  activate(pulse) {
    const { topic, data, schema, origin } = pulse
    if (this.store && schema.node) {
      const match = this.in(topic)
      if (!match) return false
      
      debug(`${this} <<< ${topic}`)
      const props = [].concat(match)
      for (let prop of props) {
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          if (!prop.active) return false
          prop.do(data)
            .then(output => this.feed(prop.path+"/output", output))
            .catch(this.error.bind(prop))
          break;
        default:
          prop.merge(data, { force: true, actor: origin })
        }
      }
      return true
    }
    return false
  }
  incoming(pulse) {
    const processed = this.activate(pulse)
    return processed ? false : super.incoming(pulse)
  }
  outgoing(pulse) {
    const { schema, origin } = pulse
    const processed = origin instanceof Interface ? false : this.activate(pulse)
    if (processed) {
      switch (schema.kind) {
      case 'action':
      case 'rpc':
        return false
      }
    }
    return super.outgoing(pulse)
  }
}

delegate(Agent.prototype, kStore)
  .method('access')
  .method('in')
  .method('get')

module.exports = Agent

