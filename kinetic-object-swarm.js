'use strict';

const Yang = require('yang-js')

const { Generator, Channel, Reaction, Reducer, Neural } = require('./lib')

const assert = require('assert')

module.exports = require('./kinetic-object-swarm.yang').bind({
  'feature(url)': () => require('url'),
  'feature(channel)': () => Channel,
  
  'extension(generator)': () => {
    return {
      scope: {
        anydata:         '0..n',
        anyxml:          '0..n',
        choice:          '0..n',
        container:       '0..n',
        description:     '0..1',
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
        'kos:reduces':   '0..n'
      },
      target: {
        module: '0..n'
      },
      resolve() {
        this.once('compile:after', () => {
          const reaction = this.lookup('extension', 'kos:reaction')
          const container = this.lookup('extension', 'container')
          if ((this.input && this.input.nodes.length) || (this.output && this.output.nodes.length))
            throw this.error('cannot contain data nodes in generator input/output')
          
          const core = this.match('kos:reaction', 'core') || new Yang('kos:reaction', 'core', reaction)
          if (this.binding) core.bind(this.binding)
          core.extends(this.input, this.output, this['if-feature'])
          delete this.input
          delete this.output
          this.merge(core, { replace: true })
          
          const state = this.match('container', 'state') || new Yang('container', 'state', container)
          for (let kw in reaction.scope) {
            state.extends(this[kw])
            delete this[kw]
          }
          this.merge(state, { replace: true })
        })
        let deps = this.match('if-feature','*')
        if (deps && !deps.every(d => this.lookup('feature', d.tag)))
          throw this.error('unable to resolve every feature dependency')
      },
      transform(self, ctx={}) {
        for (let expr of this.exprs) {
          self = expr.eval(self, ctx);
        }
        return self
      },
      construct(parent, ctx) {
        if (parent instanceof Neural.Layer)
          return new Generator(this).join(parent)
        return parent
      }
    }
  },
  'extension(reaction)': () => {
    return {
      scope: {
        description:   '0..1',
        'if-feature':  '0..n',
        input:         '1',
        output:        '0..1',
        reference:     '0..1',
        status:        '0..1'
      },
      target: {
        module: '0..n'
      },
      resolve() {
        if (this.input.nodes.length || (this.output && this.output.nodes.length))
          throw this.error("cannot contain data nodes in reaction input/output")
        let deps = this.match('if-feature','*')
        if (deps && !deps.every(d => this.lookup('feature', d.tag)))
          throw this.error('unable to resolve every feature dependency')
      },
      transform(self) {
        const { consumes, produces, persists } = self
        this.input  && this.input.exprs.forEach(expr => expr.apply(consumes, persists))
        this.output && this.output.exprs.forEach(expr => expr.apply(produces))
        
        let features = this.match('if-feature','*') || []
        self.depends = features.map(f => this.lookup('feature', f.tag))
        return self
      },
      construct(parent, ctx) {
        if (parent instanceof Neural.Layer)
          return new Reaction(this).join(parent)
        return parent
      }
    }
  },
  'extension(reduces)': () => {
    return {
      scope: {
        description:   '0..1',
        'if-feature':  '0..n',
        input:         '1',
        reference:     '0..1',
        status:        '0..1'
      },
      resolve() {
        if (this.input.nodes.length)
          throw this.error('cannot contain data nodes in reducer input')
        let deps = this.match('if-feature','*')
        if (deps && !deps.every(d => this.lookup('feature', d.tag)))
          throw this.error('unable to resolve every feature dependency')
      },
      transform(self) {
        if (self instanceof Reducer) {
          const { consumes } = self
          this.input.exprs.forEach(expr => expr.apply(consumes))

          let features = this.match('if-feature','*') || []
          self.depends = features.map(f => this.lookup('feature', f.tag))
        }
        return self
      },
      construct(parent, ctx) {
        return new Reducer(this).join(parent)
      }
    }
  },
  'extension(topic)': () => {
    return {
      scope: {
        anydata:     '0..n',
        anyxml:      '0..n',
        choice:      '0..n',
        container:   '0..n',
        description: '0..1',
        leaf:        '0..n',
        'leaf-list': '0..n',
        list:        '0..n',
        reference:   '0..1',
        status:      '0..1',
        uses:        '0..n'
      },
      target: {
        module: '0..n'
      },
      resolve() {

      }
    }
  },
  'extension(flow)': function() {
    return {
      scope: {
        description:        '0..1',
        'require-instance': '0..1',
        reference:          '0..1',
        status:             '0..1'
      },
      target: {
        input:  '0..n',
        output: '0..n'
      },
      resolve() {
        let schema = this.lookup('grouping', this.tag)
        if (!schema)
          throw this.error(`unable to resolve ${this.tag} grouping definition`)
      },
      transform(data, persists) {
        let { 'require-instance': required } = this
        let schema = this.lookup('grouping', this.tag)
        if (data instanceof Set) data.add(schema)
        if (persists instanceof Set) {
          if (required && required.tag)
            persists.add(schema)
        }
        return data
      }
    }
  },
  'extension(node)': function() {
    return {
      scope: {
        description:        '0..1',
        'require-instance': '0..1',
        reference:          '0..1',
        status:             '0..1'
      },
      target: {
        input:  '0..n',
        output: '0..n'
      },
      resolve() {
        let schema = this.locate(this.tag)
        if (!schema)
          throw this.error(`unable to resolve ${this.tag} data node`)
      },
      transform(data, persists) {
        let { 'require-instance': required } = this
        let schema = this.locate(this.tag)
        if (data instanceof Set) data.add(schema)
        if (persists instanceof Set) {
          if (required && required.tag)
            persists.add(schema)
        }
        return data
      }
    }
  },
  'extension(extends)': function() {
    return {
      resolve() {
        let from = this.lookup('kos:generator', this.tag)
        if (!from)
          throw this.error(`unable to resolve ${this.tag} component`)
        from = from.clone().compile()
        from.nodes.forEach(n => this.parent.merge(n, { replace: true }))
        if (!this.parent.binding)
          this.parent.bind(from.binding)
      }
    }
  },
  'extension(array)': function() {
    return {
      scope: {
        config:             '0..1',
        description:        '0..1',
        'if-feature':       '0..n',
        'max-elements':     '0..1',
        'min-elements':     '0..1',
        must:               '0..n',
        'ordered-by':       '0..1',
        reference:          '0..1',
        status:             '0..1',
        type:               '0..1',
        units:              '0..1',
        when:               '0..1'
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
        submodule: '0..n'
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
        if (!(data instanceof Array)) data = [ data ]
        data = data.filter(Boolean)
        for (let expr of this.exprs) {
          if (expr.kind === 'type') continue
          data = expr.eval(data, ctx)
        }
        if (this.type)
          data = this.type.apply(data, ctx)
        return data
      },
      construct(data={}, ctx={}) {
        return new Property(this.datakey, this).join(data, ctx.state)
      }
    }
  }
})
