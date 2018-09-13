'use strict';

const { Interface, Reaction }  = require('./lib')

module.exports = require('./kinetic-object-swarm.yang').bind({
  'feature(url)': () => require('url'),
  
  'extension(interface)': function() {
    return {
      scope: {
        description:     '0..1',
        input:           '0..1',
        output:          '0..1',
        reference:       '0..1',
        status:          '0..1',
        'kos:extends':   '0..n',
        'kos:interface': '0..n',
        'kos:state':     '0..1',
        'kos:reaction':  '0..n'
      },
      target: {
        module: '0..n'
      },
      resolve() {
        if (this.input.nodes.length || this.output.nodes.length)
          throw this.error("cannot contain data nodes in reaction input/output")
      },
      transform(self) {

      },
      construct(parent, ctx) {
        return new Interface(this).join(parent)
      }
    }
  },
  'extension(reaction)': function() {
    return {
      scope: {
        description:   '0..1',
        'if-feature':  '0..n',
        input:         '1',
        output:        '1',
        reference:     '0..1',
        status:        '0..1'
      },
      target: {
        module: '0..n'
      },
      resolve() {
        if (this.input.nodes.length || this.output.nodes.length)
          throw this.error("cannot contain data nodes in reaction input/output")
        let deps = this.match('if-feature','*')
        if (deps && !deps.every(d => this.lookup('feature', d.tag)))
          throw this.error('unable to resolve every feature dependency')
      },
      transform(self) {
        const { consumes, produces } = self
        this.input.exprs.forEach(expr => expr.apply(consumes))
        this.output.exprs.forEach(expr => expr.apply(produces))
        let features = this.match('if-feature','*') || []
        self.depends = features.map(f => this.lookup('feature', f.tag))
        return self
      },
      construct(parent, ctx) {
        return new Reaction(this).join(parent)
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
        let { 'require-instance': required } = data
        let schema = this.lookup('grouping', this.tag)
        if (required && required.tag) schema.sticky = true
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
        let { 'require-instance': required } = node
        let schema = this.locate(this.tag)
        if (required && required.tag) schema.sticky = true
        data.add(schema)
        return data
      }
    }
  },
  'extension(extends)': function() {
    return {
      resolve() {
        let iface = this.lookup('kos:interface', this.tag)
        if (!iface)
          throw this.error(`unable to resolve ${this.tag} interface`)
        iface = iface.clone()
        iface.tag = this.tag
        this.parent.extends(iface)
      }
    }
  }
})
