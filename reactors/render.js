'use strict'

const { kos = require('..') } = global

module.exports = kos.reactor('render')
  .desc('Provides Kinetic Reactor visualization')
  .init('reactors', new Map)

  .in('dom/element','joint/graph','joint/paper/config').and.has('module/jointjs')
  .out('joint/paper').bind(renderGraphToPaper)

  // reactor specific render triggers
  .in('render/reactor').and.has('module/jointjs')
  .out('joint/graph').bind(reactorToDiagram)

  .in('render/reactor/name').out('render/reactor').bind(renderReactorByName)

  // TODO - shouldn't need this...
  .in('reactor').bind(collectReactors)

function renderGraphToPaper(element, source, opts) {
  const joint = this.get('module/jointjs')
  const doc   = this.get('browser/document')

  let graph = new joint.dia.Graph
  opts = Object.assign({
    el: element,
    gridSize: 10,
    perpendicularLinks: true
  }, opts, { model: graph })
  let paper = new joint.dia.Paper(opts)

  if (source instanceof joint.dia.Graph)
    graph.fromJSON(source.toJSON())
  else
    graph.fromJSON(source)

  paper.fitToContent({ padding: opts.padding })
  this.send('joint/paper', paper)
}

function collectReactors(reactor) {
  this.fetch('reactors').set(reactor.label, reactor)
}

function renderReactorByName(name) {
  const reactors = this.fetch('reactors')
  if (reactors.has(name)) this.send('render/reactor', reactors.get(name))
  else this.warn('no such reactor:', name)
}

function reactorToDiagram(target) {
  const { dia, shapes } = this.get('module/jointjs')
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
  for (let { label, inputs, requires, outputs } of target.triggers) {
    let accepts = requires.concat(inputs)
    let coffset = yoffset, poffset = yoffset, hoffset = yoffset
    if (accepts.length > outputs.length) {
      poffset = yoffset + ((accepts.length - outputs.length) * 100 / 2)
      hoffset = yoffset + (accepts.length - 1) * 100 / 2
      yoffset += inputs.length * 100
    }
    else {
      coffset = yoffset + ((outputs.length - accepts.length) * 100 / 2)
      hoffset = yoffset + (outputs.length - 1) * 100 / 2
      yoffset += outputs.length * 100
    }

    let handler = t.clone()
      .attr('.label/text', label)
      .position(TX[2], hoffset)

    let consumes = accepts.map((x, idx) => {
      return p.clone()
        .attr('.label/text', x)
        .position(PX[2], coffset + (100 * idx))
      })
    let produces = outputs.map((x, idx) => {
      return p.clone()
        .attr('.label/text', x)
        .position(PX[3], poffset + (100 * idx))
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
  if (target.reactors.length) {
    let offset = yoffset + (target.reactors.length - 1) * 100 / 2
    let absorb  = t.clone()
      .attr('.label/text', 'absorb')
      .position(TX[1], offset)
    graph.addCell([
      absorb,
      link(core, absorb)
    ])
    for (let reactor of target.reactors) {
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

