/**
 * @fileoverview Agent
 * @author saintkepha (Peter Lee)
 */

const debug = require('./debug').extend('agent');
const delegate = require('delegates');

const Store = require('yang-js').Store;
const Persona = require('./persona');
const Reactor = require('./reactor');
const Filter = require('./filter');
const Pulse = require('./pulse');
const kStore = Symbol.for('kos:store');

class Agent extends Persona {

  get [Symbol.toStringTag]() { return `Agent:${this.uri}`; }
  get type() { return Symbol.for('kos:agent'); }
  get default() { return this; }

  get schema() { return super.schema; }
  set schema(x) {
    this[kStore] = undefined;
    super.schema = x;
    const store = new Store({ name: this.name }).use(x);
    store
      .on('log', this.emit.bind(this, 'log'))
      .on('error', this.emit.bind(this, 'error'));
    this[kStore] = store;
  }
  get store() { return this[kStore]; }

  constructor(props) {
    super(props);
    this.pipe(new Filter); // default drop all
  }
  create(schema) {
    return new Agent({ schema });
  }
  use(schema) {
    debug(`${this.uri} using ${schema.tag} persona module`);
    this.store.use(schema);
    return new Persona({ schema }).attach(this);
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
    });
    this.on('data', (pulse) => {
      if (verbose <= 3) return;
      if (log.trace) log.trace(`${pulse}`);
      else log.log(`${pulse}`);
    });
    this.store.on('change', (prop, actor) => {
      const { kind, path, data, changes } = prop;
      let pulse = new Pulse(`${path}`, prop).add(data).tag(this).tag(actor);
      debug(`${this.uri} <<< ${path} (${kind})`);
      this.inflow.push(pulse);  // we push here to bypass "incoming" filter
      for (let change of changes) {
	pulse = new Pulse(`${change.path}`, change).add(change.data).tag(this).tag(actor);
	this.inflow.push(pulse);
      }
      debug(`${this.uri} >>> ${path} (${kind})`);
      this.outflow.push(pulse); // we push here to bypass "outgoing" filter
    });
    //.on('change', this.propagate.bind(this, 'change'))
    return this.feed('kos:runtime', { store: this.store });
  }
  enable(...uris) {
    const ifaces = new Set(uris);
    if (ifaces.has('*')) {
      this.personas.forEach(p => {
        p.reactors.forEach(i => i.enable())
      })
    } else {
      for (let uri of ifaces) {
        const match = this.at(uri)
        if (match) match.enable()
      }
    }
    return this;
  }
  propagate(event, prop, actor) {
    let { kind, path, data } = prop;
    debug(`${this.uri} PROPAGATE ${event} ${path}`);
    
    if (kind !== 'module') {
      const pulse = new Pulse(`${path}`, prop).add(data).tag(this).tag(actor);
      switch (event) {
      case 'change':
        debug(`${this.uri} <<< ${path} (${kind})`);
        this.inflow.push(pulse);  // we push here to bypass "incoming" filter
        break;
      case 'update':
        if (prop.parent.kind !== 'kos:persona') { // do not propagate state within persona (SHOULD REMOVE IN THE FUTURE)
          debug(`${this.uri} >>> ${path} (${kind})`);
          this.outflow.push(pulse); // we push here to bypass "outgoing" filter
        }
        break;
      }
    }
  }
  async handle(pulse) {
    const { topic, schema, origin: actor } = pulse
    if (this.store && schema.node) {
      const { kind } = schema;
      if (kind === 'output') {
        debug(`${this.uri} <=> ${topic} (${schema.kind})`);
        this.inflow.push(pulse);
        this.outflow.push(pulse);
        return true;
      }
      const match = this.in(topic);
      if (!match) return false;
      
      const props = [].concat(match)
      for (let prop of props) {
	const ctx = prop.context.with({ force: true, actor });
        for (let data of pulse.values) {
	  try {
	    // XXX - do we skip push if prop is not active for rpc/action?
	    // if (!prop.active) return false
	    const res = await ctx.push(data);
	    switch (prop.kind) {
	    case 'action':
	    case 'rpc':
	      // feed the rpc/action output back into kos?
	      this.feed(`${prop.path}/output`, res);
	      break;
	    }
	  }
	  catch (err) {
	    this.log('error', err, prop);
	  }
        }
        debug(`${this.uri} <-> ${prop.path} (${kind}) [${pulse.values.size}]`);
      }
      return true
    }
    return false
  }
  async incoming(pulse) { return await this.handle(pulse) ? false : super.incoming(pulse); }
  async outgoing(pulse) { return await this.handle(pulse) ? false : super.outgoing(pulse); }
}

delegate(Agent.prototype, kStore)
  .method('access')
  .method('in')
  .method('get')

module.exports = Agent;

