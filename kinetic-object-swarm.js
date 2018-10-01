'use strict';

const { Interface, Component, Channel, Reaction, Reducer } = require('./lib')
const { Property } = require('yang-js')

module.exports = require('./kinetic-object-swarm.yang').bind({
  'feature(url)': () => require('url'),
  'feature(channel)': () => Channel,
  'feature(interface)': () => Interface,
  
  'extension(component)': () => {
    return {
      scope: {
        anydata:         '0..n',
        anyxml:          '0..n',
        choice:          '0..n',
        container:       '0..n',
        description:     '0..1',
        leaf:            '0..n',
        'leaf-list':     '0..n',
        list:            '0..n',
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
      transform(self, ctx={}) {
        if (self instanceof Component) {
          for (let attr of this.attrs) {
            self = attr.eval(self, ctx)
          }
          self.state = {}
          new Property('state', this).join(self)
          for (let node of this.nodes) {
            switch (node.kind) {
            case 'kos:reaction':
            case 'kos:reduces':
              node.eval(self, ctx)
            }
          }
        } else {
          for (let node of this.nodes) {
            switch (node.kind) {
            case 'kos:reaction': break;
            case 'kos:reduces':
              node = node.clone()
              delete node.binding
              new Property(node.tag, node).join(self);
              break;
            default:
              node.eval(self, ctx)
            }
          }
        }
        return self
      },
      construct(parent, ctx) {
        // TODO: we should skip unless parent is a kos stream
        return new Component(this).join(parent)
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
        const { consumes, produces } = self
        this.input  && this.input.exprs.forEach(expr => expr.apply(consumes))
        this.output && this.output.exprs.forEach(expr => expr.apply(produces))
        
        let features = this.match('if-feature','*') || []
        self.depends = features.map(f => this.lookup('feature', f.tag))
        return self
      },
      construct(parent, ctx) {
        return new Reaction(this).join(parent)
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
      transform(data) {
        let { 'require-instance': required } = this
        let schema = this.lookup('grouping', this.tag)
        schema.sticky = required && required.tag
        data.add(schema)
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
      transform(data) {
        let { 'require-instance': required } = this
        let schema = this.locate(this.tag)
        schema.sticky = required && required.tag
        data.add(schema)
        return data
      }
    }
  },
  'extension(extends)': function() {
    return {
      resolve() {
        let component = this.lookup('kos:component', this.tag)
        if (!component)
          throw this.error(`unable to resolve ${this.tag} component`)
        component = component.clone().compile()
        component.nodes.forEach(n => this.parent.merge(n, { replace: true }))
      }
    }
  }
})
