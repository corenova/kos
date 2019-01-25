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
      .on('log', this.emit.bind(this,'log'))
      .on('error', this.emit.bind(this,'error'))
      .on('update', this.propagate.bind(this));
    this[kStore] = store;
  }
  get store() { return this[kStore]; }

  create(schema) {
    return new Agent(schema);
  }
  use(schema) {
    debug(`${this.uri} using ${schema.tag} interface module`);
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
      log.error(err);
      if (verbose > 1) log.debug(err.ctx);
    });
    this.on('log', (topic, args, ctx={}) => {
      log[topic](...args);
      if (verbose > 2) log[topic](ctx.uri);
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
  propagate(prop, actor) {
    let { kind, path, content } = prop;
    if (kind !== 'module') {
      const pulse = this.make(`${path}`, content).tag(actor);
      debug(`${this.uri} >>> ${path} (${kind})`);
      this.inflow.push(pulse);  // we push here to bypass "incoming" filter
      this.outflow.push(pulse); // we push here to bypass "outgoing" filter
    }
  }
  activate(pulse) {
    const { topic, data, schema, origin: actor } = pulse
    if (this.store && schema.node) {
      const match = this.in(topic);
      if (!match) return false;
      
      const props = [].concat(match)
      for (let prop of props) {
        const { kind, path } = prop;
        switch (prop.kind) {
        case 'action':
        case 'rpc':
          if (!prop.active) return false;
          prop.do(data)
            .then(output => this.feed(path+"/output", output))
            .catch(error => this.log('error', error, prop));
          break;
        default:
          prop.merge(data, { force: true, actor })
        }
        debug(`${this.uri} <<< ${path} (${kind})`);
      }
      return true
    }
    return false
  }
  incoming(pulse) { return this.activate(pulse) ? false : super.incoming(pulse); }
  outgoing(pulse) { return this.activate(pulse) ? false : super.outgoing(pulse); }
}

delegate(Agent.prototype, kStore)
  .method('access')
  .method('in')
  .method('get')

module.exports = Agent

