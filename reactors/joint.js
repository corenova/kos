'use strict'

const { kos = require('..') } = global

module.exports = kos
  .reactor('joint', 'Provides jointjs graph rendering... for now')
  .setState('reactors', new Map)

  .in('reactor').bind(collectReactors)
  .in('joint/create/flow').out('joint/flow').bind(locateFlowInstance)
  .in('joint/flow').out('joint/graph').use('module/jointjs').bind(flowToJointDiagram)

function collectReactors(reactor) {
  this.fetch('reactors').set(reactor.label, reactor)
}

function locateFlowInstance(name) {
  let flows = this.fetch('reactors')
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
  // a subnet is a nested petri-net
  const subnet = p.clone().attr('.root/stroke-width', 7)

  let PX = [ 50, 210, 400, 590, 850, 1020 ]
  let TX = [ 150, 310, 510, 700, 950 ]

  let input  = p.clone().attr('.label/text', 'input')
  let reject = p.clone().attr('.label/text', 'reject')
  let core   = p.clone().attr('.label/text', 'core')
  let buffer = p.clone().attr('.label/text', 'buffer')
  let output = p.clone().attr('.label/text', 'output')

  let accept   = t.clone().attr('.label/text', 'accept')
  let consume  = t.clone().attr('.label/text', 'consume')
  let produce  = t.clone().attr('.label/text', 'produce')
  let feedback = t.clone().attr('.label/text', 'feedback')
  let send     = t.clone().attr('.label/text', 'send')

  graph.addCell([ input, core, reject, buffer, output, accept, consume, produce, feedback ])
  graph.addCell([
    link(input, accept),
    link(accept, core),
    link(accept, reject),
    link(core, consume),
    link(consume, reject),
    link(buffer, produce),
    link(produce, output)
  ])

  let yoffset = 50
  // generate the trigger PTN model
  for (let { label, inputs, outputs } of flow.triggers) {
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

    let handler = t.clone().attr('.label/text', label).position(TX[2], hoffset)

    let consumes = inputs.map((x, idx) => {
      return p.clone().attr('.label/text', x).position(PX[2], coffset + (100 * idx))
    })
    let produces = outputs.map((x, idx) => {
      return p.clone().attr('.label/text', x).position(PX[3], poffset + (100 * idx))
    })

    graph.addCells(...consumes, ...produces, handler)

    consumes.forEach(x => graph.addCell([
      link(consume, x), link(x, handler)
    ]))
    produces.forEach((x, idx) => {
      let out = send.clone().position(TX[3], poffset + (100 * idx))
      graph.addCell([
        out, 
        link(handler, x),
        link(x, out), 
        link(out, buffer)
      ])
    })
  }
  
  //
  // Position the main PT elements based on computed flow triggers and reactors
  //
  let ycenter = (yoffset-50) / 2
  // Places
  input.position(PX[0], ycenter)
  reject.position(PX[1], ycenter-50)
  core.position(PX[1], ycenter+50)
  buffer.position(PX[4], ycenter)
  output.position(PX[5], ycenter)
  // Transitions
  accept.position(TX[0], ycenter)
  consume.position(TX[1], ycenter)
  produce.position(TX[4], ycenter)

  // generate the embedded reactor PTN subnets
  if (flow.reactors.length) {
    let offset = yoffset + (flow.reactors.length - 1) * 100 / 2
    let absorb  = t.clone()
      .attr('.label/text', 'absorb')
      .position(TX[1], offset)
    graph.addCell([
      absorb,
      link(core, absorb)
    ])
    for (let reactor of flow.reactors) {
      let sub  = subnet.clone()
        .attr('.label/text', reactor.label)
        .position(PX[2], yoffset)
      let out = send.clone().position(TX[3], yoffset)
      graph.addCell([
        sub, out, 
        link(absorb, sub),
        link(sub, out),
        link(out, buffer)
      ])
      yoffset += 100
    }
  }
  
  // handle feedback transition last
  feedback.position(TX[2], yoffset-25)
  graph.addCell([
    link(feedback, core).set('router', { name: 'orthogonal' }),
    //link(produce, input).set('router', { name: 'orthogonal' }),
    link(buffer, feedback)
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
          'stroke': '#999999'
          //'stroke': '#4b4a67'
        },
        '.marker-target': { fill: '#999999' },
        '.connection-wrap': { display: 'none' },
        '.marker-vertices': { display: 'none' },
        '.marker-arrowheads': { display: 'none' },
        '.link-tools': { display: 'none' }
      }
    })
  }
}
