const assert = require('assert'); // do we really need this?
const { Container, Property } = require('yang-js');
const { Connector, Controller, Dataflow, Generator, Processor, Terminator } = require('./lib');

module.exports = require('./kinetic-object-stream.yang').bind({
  //
  // Kinetic Object Stream YANG Extensions
  //
  'extension(persona)': {
    scope: {
      action:           '0..n',
      anydata:          '0..n',
      container:        '0..n',
      description:      '0..1',
      grouping:         '0..n',
      input:            '0..1',
      leaf:             '0..n',
      'leaf-list':      '0..n',
      list:             '0..n',
      output:           '0..1',
      reference:        '0..1',
      status:           '0..1',
      uses:             '0..n',
    },
    target: {
      module: '0..n',
    },
  },
  
  'extension(interface)': {
    scope: {
      action:          '1..n', // must have at least one action defined
      description:     '0..1',
      reference:       '0..1',
      status:          '0..1',
    },
    target: {
      module: '0..n',
    },
  },

  'extension(component)': {
    scope: {
      action:           '0..n',
      description:      '0..1',
      input:            '0..1',
      output:           '0..1',
      reference:        '0..1',
      status:           '0..1',
      'kos:instanceof': '1',    // must be an instanceof a persona
      'kos:implements': '0..n', // can implement multiple interfaces
    },
    target: {
      module: '0..n',
    },
    resolve() {
      const hasInput  = this.input && this.input.nodes.length;
      const hasOutput = this.output && this.output.nodes.length;
      if (!hasInput || !hasOutput)
	throw this.error("component must have input or output nodes");
      
      // let deps = this.match('if-feature','*')
      // if (deps && !deps.every(d => this.lookup('feature', d.tag)))
      //   throw this.error(`${this.uri} unable to resolve every feature dependency: ${deps.map(d => d.datakey)}`)
    },
  },

  'extension(blueprint)': {
    scope: {
      description:  '0..1',
      reference:    '0..1',
      status:       '0..1',
      'kos:link':   '0..n',
      'kos:node':   '0..n',
    },
    target: {
      module: '0..n',
    },
    construct() {
      return new Container(this).attach(...arguments);
    },
  },
  
  'extension(node)': {
    scope: {
      action:           '0..n',
      anydata:          '0..n',
      anyxml:           '0..n',
      choice:           '0..n',
      container:        '0..n',
      description:      '0..1',
      grouping:         '0..n',
      'if-feature':     '0..n',
      input:            '0..1',
      leaf:             '0..n',
      'leaf-list':      '0..n',
      list:             '0..n',
      output:           '0..1',
      reference:        '0..1',
      status:           '0..1',
      uses:             '0..n',
      'kos:instanceof': '1',    // must be an instanceof a persona
      'kos:extends':    '0..1', // can extend only one component (for now...)
      'kos:implements': '0..n', // can implement multiple interfaces
    },
    resolve() {
      const overrides = (source) => ({
	transform(data={}, ...args) {
	  for (const expr of this.exprs)
	    data = expr.eval(data, ...args);
	  return data;
	},
	construct() {
	  return new Dataflow(this).attach(...arguments);
	},
      });

      if (this.input)  this.input.override(overrides);
      if (this.output) this.output.override(overrides);
      
      // let deps = this.match('if-feature','*')
      // if (deps && !deps.every(d => this.lookup('feature', d.tag)))
      //   throw this.error(`${this.uri} unable to resolve every feature dependency: ${deps.map(d => d.datakey)}`)
    },
    transform(data={}, ...args) { // always initialize
      for (const expr of this.exprs)
	data = expr.eval(data, ...args);
      return data;
    },
    construct() {
      let actor, instantiate = this['kos:instanceof'].binding;

      if (typeof instantiate === 'function') {
	actor = instantiate(this);
      }
      else if (this.input && this.output) {
	actor = new Processor(this);
      }
      else if (this.output) {
	actor = new Generator(this);
      }
      else if (this.input) {
	actor = new Terminator(this);
      }
      else {
	actor = new Controller(this);
      }
      return actor.attach(...arguments);
    }
  },

  'extension(instanceof)': {
    resolve() {
      const from = this.lookup('persona', this.tag);
      if (!from)
        throw this.error(`unable to resolve ${this.tag} persona`);
      for (const n of from.nodes) {
	// this.parent.merge(n.clone({ relative: false }), { replace: true });
	this.parent.update(n.clone({ relative: false }));
      }
      const overrides = (source) => ({
	construct() { return from.binding(this).attach(...arguments); }
      });
      if (from.binding) {
	this.parent.override(overrides);
      } else {
	from.once('bound', () => this.parent.override(overrides));
      }
    },
  },
  
  'extension(extends)': {
    resolve() {
      let from = this.lookup('component', this.tag);
      if (!from)
        throw this.error(`unable to resolve ${this.tag} transform`);
      for (const n of from.nodes) {
	this.parent.merge(n.clone({ relative: false }), { replace: true });
      }
      if (!this.parent.binding)
	this.parent.bind(from.binding)
    }
  },
  
  'extension(implements)': {
    resolve() {
      let from = this.lookup('interface', this.tag);
      if (!from)
        throw this.error(`unable to resolve ${this.tag} interface`);
      from = from.clone().compile();
      this.parent.extends(from.nodes);
    }
  },

  'extension(flow)': {
    scope: {
      description:   '0..1',
      'if-feature':  '0..n',
      reference:     '0..1',
      status:        '0..1',
      'kos:filter':  '0..n',
      'kos:source':  '1',
      'kos:target':  '1',
    },
    construct() {
      return new Connector(this).attach(...arguments);
    }
  },
  
  'extension(source)': {
    scope: {
      description:        '0..1',
      reference:          '0..1',
      status:             '0..1',
    },
    resolve() {
      if (!this.locate(`../../${this.tag}`))
        throw this.error(`unable to resolve ${this.tag} ${this.argument}`)
      // TODO: should we this.normalizePath(this.tag) here?
      // TODO: should confirm the source node is streamable
    },
    transform(flow) { // only applies to flow extension
      flow.source = flow.parent.in(this.tag);
      return flow;
    }
  },
  
  'extension(target)': {
    scope: {
      description:        '0..1',
      reference:          '0..1',
      status:             '0..1',
    },
    resolve() {
      if (!this.locate(`../../${this.tag}`))
        throw this.error(`unable to resolve ${this.tag} ${this.argument}`)
      // TODO: should we this.normalizePath(this.tag) here?
      // TODO: should confirm the target node is streamable
    },
    transform(flow) { // only applies to flow extension
      flow.target = flow.parent.in(this.tag);
      return flow;
    }
  },

  'extension(array)': {
    scope: {
      config:         '0..1',
      description:    '0..1',
      'if-feature':   '0..n',
      'max-elements': '0..1',
      'min-elements': '0..1',
      must:           '0..n',
      'ordered-by':   '0..1',
      reference:      '0..1',
      status:         '0..1',
      type:           '0..1',
      units:          '0..1',
      when:           '0..1',
    },
    target: {
      augment:   '0..n',
      container: '0..n',
      grouping:  '0..n',
      input:     '0..n',
      list:      '0..n',
      module:    '0..n',
      notification: '0..n',
      output:    '0..n',
      submodule: '0..n',
    },
    predicate(data=[]) {
      assert(data instanceof Array, "data must contain an Array")
    },
    transform(data, ctx) {
      if (!data) {
        data = []
        for (let expr of this.exprs)
          data = expr.eval(data, ctx)
        return undefined
      }
      if (data && !Array.isArray(data)) data = [ data ]
      for (let expr of this.exprs) {
        if (expr.kind === 'type') continue
        data = expr.eval(data, ctx)
      }
      if (this.type)
        data = this.type.apply(data, ctx)
      return data
    },
    construct(data={}, ...args) {
      return new Property(this).attach(data, ...args);
    }
  },
  
  'extension(private)': {
    target: {
      anydata:     '0..1',
      container:   '0..1',
      leaf:        '0..1',
      'leaf-list': '0..1',
      list:        '0..1',
      refine:      '0..1',
    },
    resolve() {
      this.tag = (this.tag === 'true');
    },
    transform(data, ctx) {
      if (ctx && ctx.property && this.tag) {
        // this forces the context property to become 'hidden' non-enumerable.
        ctx.property.state.private = this.tag;
      }
      return data;
    }
  },
  
  //
  // Kinetic Object Stream (built-in) Personas
  //
  // 'kos:persona(Reactor)':    (schema) => new Reactor(schema),
  // 'kos:persona(Generator)':  (schema) => new Generator(schema),
  // 'kos:persona(Terminator)': (schema) => new Terminator(schema),
  // 'kos:persona(Controller)': (schema) => new Controller(schema),
  // 'kos:persona(Connector)':  (schema) => new Connector(schema),
});
