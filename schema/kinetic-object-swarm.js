'use strict'

const { Reaction } = require('../lib')

const Yang = require('yang-js')
module.exports = require('./kinetic-object-swarm.yang').bind({

  'extension(reaction)': function() {
    return {
      scope: {
        container:     '0..n',
        description:   '0..1',
        'if-feature':  '0..n',
        input:         '1',
        leaf:          '0..n',
        'leaf-list':   '0..n',
        list:          '0..n',
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
      },
      transform(self) {
        const regex = /^kos:(data|node)$/
        const extract = node => {
          let { kind, tag, 'require-instance': required } = node
          let schema
          switch (kind) {
          case 'kos:node': schema = this.locate(tag)
            break;
          case 'kos:data': schema = this.lookup('grouping', tag)
            break;
          }
          if (required) required = required.tag
          return { required, schema }
        }
        let features = this.match('if-feature','*') || []
        let inputs  = this.input.exprs.filter(x => regex.test(x.kind)).map(extract)
        let outputs = this.output.exprs.filter(x => regex.test(x.kind)).map(extract)
        const depends  = new Map
        const requires = new Set
        const consumes = new Set
        const produces = new Set
        for (let f of features) {
          depends.set(f.tag, this.lookup('feature', f.tag))
        }
        for (let data of inputs) {
          const { required, schema } = data
          required ? requires.add(schema) : consumes.add(schema)
        }
        for (let data of outputs) {
          const { required, schema } = data
          produces.add(schema)
        }
        self.bounds = {
          depends, requires, consumes, produces
        }
        return self
      },
      construct(parent, ctx) {
        return new Reaction({ schema: this }).join(parent)
      }
    }
  },
  
  topology() {
    this.content = {
      checksum: 'random' 
    }
    return this.content
  }
})
