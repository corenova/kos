'use strict'

const { kos = require('..') } = global

module.exports = kos.create('joint')
  .require('module/jointjs')

  .in('joint/create/flow').out('joint/flow').bind(locateFlowInstance)
  .in('joint/flow').out('joint/graph').bind(flowToJointDiagram)

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

  let PX = [ 50, 210, 400, 590, 760 ]
  let TX = [ 150, 310, 510, 700 ]

  let origin = p.clone().attr({ '.label': { text: flow.label } }).position(PX[0], 100)
  let ready  = p.clone().attr({ '.label': { text: 'ready' } }).position(PX[1], 50)
  let input  = p.clone().attr({ '.label': { text: 'input' } }).position(PX[1], 150)
  let output = p.clone().attr({ '.label': { text: 'output' } }).position(PX[4], 100)

  let accept  = t.clone().attr({ '.label': { text: 'accept' } }).position(TX[0], 100)
  let consume = t.clone().attr({ '.label': { text: 'consume' } }).position(TX[1], 100)

  graph.addCell([ origin, input, ready, output, accept, consume ])
  graph.addCell([
    link(origin, accept),
    link(accept, input),
    link(accept, ready),
    link(input, consume),
    link(ready, consume)
  ])

  let yoffset = 50
  for (let { label, inputs, outputs } of flow.reactors) {
    let coffset = yoffset, poffset = yoffset, hoffset = yoffset
    if (inputs.length > outputs.length) {
      poffset = yoffset + ((inputs.length - outputs.length) * 100 / 2)
      hoffset = yoffset + (inputs.length - 1) * 100 / 2
      yoffset += inputs.length * 100
    }
    else {
      coffset = yoffset + ((outputs.length - inputs.length) * 100 / 2)
      hoffset = yoffset + (outputs.length - 1) * 100 / 2
      yoffset += outputs.length * 100
    }

    let handler = t.clone().attr({ '.label': { text: label }}).position(TX[2], hoffset)

    let consumes = inputs.map((x, idx) => {
      return p.clone().attr({ '.label': { text: x } }).position(PX[2], coffset + (100 * idx))
    })
    let produces = outputs.map((x, idx) => {
      return p.clone().attr({ '.label': { text: x } }).position(PX[3], poffset + (100 * idx))
    })

    graph.addCells(...consumes, ...produces, handler)

    consumes.forEach(x => graph.addCells(link(consume, x), link(x, handler)))
    produces.forEach((x, idx) => {
      let send = t.clone().attr({ '.label': { text: 'send' } }).position(TX[3], poffset + (100 * idx))
      graph.addCells(send, link(x, send), link(send, output), link(handler, x))
    })
  }

  // handle produce transition last
  let produce = t.clone().attr({ '.label': { text: 'produce' } }).position(TX[1], yoffset-25)
  graph.addCell([
    produce,
    link(produce, input).set('router', { name: 'orthogonal' }),
    link(produce, origin).set('router', { name: 'orthogonal' }),
    link(output, produce)
      .set('router', { name: 'orthogonal' })
      .set('vertices', [{ x: PX[4]+25, y: yoffset }])
    // link(produce, input).set('vertices',  [{ x: PX[1]+25, y: yoffset }]),
    // link(produce, origin).set('vertices', [{ x: PX[0]+25, y: yoffset }]),
  ])

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
        },
        '.connection-wrap': { display: 'none' },
        '.marker-vertices': { display: 'none' },
        '.marker-arrowheads': { display: 'none' },
        '.link-tools': { display: 'none' }
      }
    })
  }
}
