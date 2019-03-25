/**
 * @fileoverview Agent
 * @author saintkepha (Peter Lee)
 */

const debug = require('./debug').extend('agent');
const delegate = require('delegates');

const Store = require('yang-js').Store;
const Persona = require('./persona');
const Pulse = require('./pulse');
const Interface = require('./interface');
const kStore = Symbol.for('kos:store');

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
      .on('log', this.emit.bind(this, 'log'))
      .on('error', this.emit.bind(this, 'error'))
      .on('change', this.propagate.bind(this, 'change'))
      .on('update', this.propagate.bind(this, 'update'))
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
      log.error(err.message);
      if (verbose > 0) log.error(err.ctx, err.stack);
    });
    this.on('log', (topic, args, ctx={}) => {
      if (topic === 'error' && args[0] instanceof Error)
        args.push(`[${args[0].uri}]`);
      if (verbose > 1) args.push(`[${ctx.uri}]`);
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
    const personas = new Set(uris);
    if (personas.has('*')) {
      this.interfaces.forEach(i => {
        i.personas.forEach(p => p.enable())
      })
    } else {
      for (let uri of personas) {
        const match = this.at(uri)
        if (match) match.enable()
      }
    }
    return this;
  }
  propagate(event, prop, actor) {
    let { kind, path, content } = prop;
    if (kind !== 'module') {
      const pulse = new Pulse(`${path}`, prop).add(content).tag(this).tag(actor);
      switch (event) {
      case 'change':
        debug(`${this.uri} <<< ${path} (${kind})`);
        this.inflow.push(pulse);  // we push here to bypass "incoming" filter
        break;
      case 'update':
        debug(`${this.uri} >>> ${path} (${kind})`);
        this.outflow.push(pulse); // we push here to bypass "outgoing" filter
        break;
      }
    }
  }
  activate(pulse) {
    const { topic, schema, origin: actor } = pulse
    if (this.store && schema.node) {
      const match = this.in(topic);
      if (!match) return false;
      
      const props = [].concat(match)
      for (let prop of props) {
        const { kind, path } = prop;
        for (let data of pulse.values) {
          switch (kind) {
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
        }
        debug(`${this.uri} <-> ${path} (${kind}) [${pulse.values.size}]`);
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

