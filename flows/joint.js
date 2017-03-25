'use strict'

const { kos = require('..') } = global

module.exports = kos.create('joint')
  .require('module/jointjs')
  .default('flows', new Map)

  .in('joint/create/flow').out('joint/flow').bind(locateFlowInstance)
  .in('joint/flow').out('joint/graph').bind(flowToJointDiagram)
  .in('kos').bind(collectFlows)

function locateFlowInstance(name) {
  let flows = this.fetch('flows')
  if (flows.has(name)) this.send('joint/flow', flows.get(name))
  else this.warn('no such flow:', name)
}

function flowToJointDiagram(flow) {
  const { dia, shapes } = this.fetch('module/jointjs')
  const { Place, Transition, Link } = shapes.pn
  const graph = new dia.Graph
  const p = new Place({
    attrs: {
      '.label': { fill: '#7c68fc'},
      '.root': { stroke: '#9586fd', 'stroke-width': 3 },
      '.tokens > circle': { fill: '#7a7e9b' }
    }
  })
  const t = new Transition({
    attrs: {
      '.label': {fill: '#fe854f'},
      '.root': {fill: '#9586fd', stroke: '#9586fd'}
    }
  })

  let origin = p.clone().attr({ '.label': { text: flow.label } })
  let input  = p.clone().attr({ '.label': { text: 'input' } })
  let ready  = p.clone().attr({ '.label': { text: 'ready' } })
  let output = p.clone().attr({ '.label': { text: 'output' } })

  let accept  = t.clone().attr({ '.label': { text: 'accept' } })
  let consume = t.clone().attr({ '.label': { text: 'consume' } })
  let produce = t.clone().attr({ '.label': { text: 'produce' } })

  graph.addCell([ origin, input, ready, output, accept, consume, produce ])
  graph.addCell([
    link(origin, accept),
    link(accept, input),
    link(accept, ready),
    link(input, consume),
    link(ready, consume),
    link(consume, origin),
    link(output, produce),
    link(produce, input)
  ])

  for (const reactor of flow.reactors) {
    let inputs = reactor.inputs.map((x, idx) => {
      return p.clone().attr({ '.label': { text: x } })
    })
    let outputs = reactor.outputs.map((x, idx) => {
      return p.clone().attr({ '.label': { text: x } })
    })
    let handler = t.clone().attr({ '.label': { text: reactor.label }})

    graph.addCells(...inputs, ...outputs, handler)

    inputs.forEach(x => graph.addCells(link(consume, x), link(x, handler)))
    outputs.forEach(x => {
      let send = t.clone().attr({ '.label': { text: 'send' } })
      graph.addCells(link(x, send), link(send, output), link(handler, x))
    })
  }

  this.send('joint/graph', graph)

  function link(a, b) {
    return new Link({
      source: {id: a.id, selector: '.root'},
      target: {id: b.id, selector: '.root'},
      attrs: {
        '.connection': {
          'fill': 'none',
          'stroke-linejoin': 'round',
          'stroke-width': '2',
          'stroke': '#4b4a67'
        }
      }
    })
  }
}

function collectFlows(flow) {
  this.fetch('flows').set(flow.label, flow)
}
