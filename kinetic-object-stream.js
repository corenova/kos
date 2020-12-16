'use strict';

const Yang = require('yang-js')

const { Property } = Yang
const { Reactor, Reaction, Channel, Neural } = require('./lib')

const assert = require('assert')

module.exports = require('./kinetic-object-stream.yang').bind({
  'feature(url)': require('url'),
  'feature(channel)': Channel,

  'extension(reactor)': {
    scope: {
      anydata:         '0..n',
      anyxml:          '0..n',
      choice:          '0..n',
      container:       '0..n',
      description:     '0..1',
      grouping:        '0..n',
      'if-feature':    '0..n',
      input:           '0..1',
      leaf:            '0..n',
      'leaf-list':     '0..n',
      list:            '0..n',
      output:          '0..1',
      reference:       '0..1',
      status:          '0..1',
      uses:            '0..n',
      'kos:extends':   '0..n',
      'kos:reaction':  '0..n',
    },
    target: {
      module: '0..n',
    },
    resolve() {
      this.once('compiled', () => {
        //const container = this.lookup('extension', 'container')
        if ((this.input && this.input.nodes.length) || (this.output && this.output.nodes.length))
          throw this.error('cannot contain data nodes in stream input/output')
        // const state = new Yang('container', 'state', container)
        // const nodes = this.nodes.filter(n => {
        //   return (n.kind in container.scope) && (n.tag !== 'state')
        // })
	// console.warn('reactor.resolve', nodes);
        // state.extends(nodes)
        // this.removes(nodes)
        // this.update(state)
      })
      let deps = this.match('if-feature','*')
      if (deps && !deps.every(d => this.lookup('feature', d.tag)))
        throw this.error(`${this.uri} unable to resolve every feature dependency: ${deps.map(d => d.datakey)}`)
    },
    transform(self, ctx) {
      if (self instanceof Reactor) {
	const { consumes, produces } = self
	for (let node of this.nodes) {
          switch (node.kind) {
          case 'input':  node.exprs.forEach(expr => expr.apply(consumes)); break;
          case 'output': node.exprs.forEach(expr => expr.apply(produces)); break;
          case 'kos:reaction': node.eval(self, ctx); break;
          default: self = node.eval(self, ctx)
          }
	}
      } else {
	const container = this.lookup('extension', 'container');
	const nodes = this.nodes.filter(n => (n.kind in container.scope))
	for (let node of nodes) {
	  self = node.eval(self, ctx);
	}
      }
      return self
    },
    construct(obj, ctx) {
      if (obj instanceof Neural.Layer)
        return new Reactor({ schema: this }).attach(obj, ctx)
      return obj
    }
  },
  'extension(reaction)': {
    scope: {
      description:   '0..1',
      'if-feature':  '0..n',
      input:         '1',
      output:        '0..1',
      reference:     '0..1',
      status:        '0..1',
    },
    resolve() {
      if (this.input.nodes.length || (this.output && this.output.nodes.length))
        throw this.error("cannot contain data nodes in reaction input/output")
      let deps = this.match('if-feature','*')
      if (deps && !deps.every(d => this.lookup('feature', d.tag)))
        throw this.error(`${this.uri} unable to resolve every feature dependency: ${deps.map(d => d.datakey)}`)
    },
    transform(self) {
      if (self instanceof Reaction) {
	const { consumes, produces } = self
	this.input  && this.input.exprs.forEach(expr => expr.apply(consumes))
	this.output && this.output.exprs.forEach(expr => expr.apply(produces))
	
	let features = this.match('if-feature','*') || []
	self.depends = features.map(f => {
	  const schema = this.lookup('feature', f.tag);
	  return [ schema, schema.binding ];
	})
      }
      return self
    },
    construct(parent, ctx) {
      if (parent instanceof Neural.Layer)
        return new Reaction({ schema: this }).attach(parent, ctx)
      return parent
    }
  },
  'extension(data)': {
    scope: {
      description:        '0..1',
      'require-instance': '0..1',
      reference:          '0..1',
      status:             '0..1',
    },
    target: {
      input:  '0..n',
      output: '0..n',
    },
    resolve() {
      let schema = this.lookup('grouping', this.tag)
      if (!schema)
        throw this.error(`unable to resolve ${this.tag} grouping definition`)
    },
    transform(data) {
      let { 'require-instance': required } = this
      let schema = this.lookup('grouping', this.tag)
      let opts = { persist: (required && required.tag) === true }
      for (let expr of this.exprs)
        opts = expr.eval(opts)
      data.set(schema, opts)
      return data
    }
  },
  'extension(node)': {
    scope: {
      description:        '0..1',
      'require-instance': '0..1',
      'kos:filter':       '0..n',
      reference:          '0..1',
      status:             '0..1',
    },
    target: {
      input:  '0..n',
      output: '0..n',
    },
    resolve() {
      let schema = this.locate(this.tag)
      if (!schema)
        throw this.error(`unable to resolve ${this.tag} data node`)
    },
    transform(data, persists) {
      let { 'require-instance': required } = this
      let schema = this.locate(this.tag)
      let opts = { persist: (required && required.tag) === true }
      if (schema.kind === 'list') {
        const elems = this.tag.split('/')
        if (elems[elems.length-1] === '.')
          opts.filter = (x) => !Array.isArray(x);
        else
          opts.filter = (x) => Array.isArray(x);
      }
      for (let expr of this.exprs)
        opts = expr.eval(opts)
      data.set(schema, opts)
      return data
    }
  },
  'extension(extends)': {
    resolve() {
      let from = this.lookup('kos:reactor', this.tag);
      if (!from)
        throw this.error(`unable to resolve ${this.tag} reactor`);
      this.parent.once('compiled', () => {
	this.debug(`extending ${this.tag}`);
	for (const n of from.nodes) {
          if (n.kind === 'kos:reaction') {
            this.parent.merge(n.clone({ relative: false }), { replace: true });
          } else {
            this.parent.update(n.clone());
          }
	}
      });
      // if (!this.parent.binding)
      //   this.parent.bind(from.binding)
    }
  },
  'extension(filter)': {
    transform(data) {
      return data
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
    construct(data={}, ctx={}) {
      return new Property(this).attach(data, ctx)
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
  }
})
