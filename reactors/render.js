'use strict'

const { kos = require('..') } = global

module.exports = kos.reactor('render')
  .desc('Provides Kinetic Reactor visualization')
  .init('reactors', new Map)

  // reactor specific render triggers
  .in('render/reactor').and.has('module/jointjs')
  .out('joint/graph','joint/token').bind(reactorToDiagram)

  .in('joint/graph','render/paper').and.has('module/jointjs')
  .out('joint/paper').bind(renderGraphToPaper)

  .in('joint/paper','joint/token').and.has('render/reactor')
  .bind(animateReactorFlow)

  // TODO - shouldn't need these
  .in('render/reactor/name').out('render/reactor').bind(renderReactorByName)
  .in('reactor').bind(collectReactors)

function reactorToDiagram(target) {
  const { dia, shapes, V } = this.get('module/jointjs')
  const { Place, Transition, Link } = shapes.pn
  const graph = new dia.Graph
  const p = new Place({
    attrs: {
      '.label': { fill: '#7c68fc'},
      '.root': { stroke: '#9586fd', 'stroke-width': 3 },
      '.tokens > circle': { fill: '#7a7e9b' }
    },
    tokens: 0
  })
  const t = new Transition({
    attrs: {
      '.label': {fill: '#fe854f'},
      '.root': {fill: '#9586fd', stroke: '#9586fd'}
    }
  })
  // a subnet is a nested petri-net
  const subnet = p.clone().attr('.root/stroke-width', 7)

  //let PX = [ 50, 210, 400, 590, 850, 1020 ]
  //let TX = [ 150, 310, 510, 700, 950 ]
  let PX = [ 0, 160, 350, 540, 800, 970 ]
  let TX = [ 100, 260, 460, 650, 900 ]

  let input  = p.clone().attr('.label/text', 'input').set('kinetic', target.id)
  let reject = p.clone().attr('.label/text', 'reject')
  let core   = p.clone().attr('.label/text', 'core').set('kinetic', 'core')
  let buffer = p.clone().attr('.label/text', 'buffer').set('kinetic', 'buffer')
  let output = p.clone().attr('.label/text', 'output').set('kinetic', 'output')

  let accept   = t.clone().attr('.label/text', 'accept').set('kinetic', 'accept')
  let feedback = t.clone().attr('.label/text', 'feedback').set('kinetic', 'feedback')
  let consume  = t.clone().attr('.label/text', 'consume').set('kinetic', 'consume')
  let produce  = t.clone().attr('.label/text', 'produce').set('kinetic', 'produce')
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
  for (let { id, label, inputs, requires, outputs, state } of target.triggers) {
    let accepts = requires.concat(inputs)
    let coffset = yoffset, poffset = yoffset, hoffset = yoffset
    if (accepts.length > outputs.length) {
      poffset = yoffset + ((accepts.length - outputs.length) * 100 / 2)
      hoffset = yoffset + (accepts.length - 1) * 100 / 2
      yoffset += accepts.length * 100
    }
    else {
      coffset = yoffset + ((outputs.length - accepts.length) * 100 / 2)
      hoffset = yoffset + (outputs.length - 1) * 100 / 2
      yoffset += outputs.length * 100
    }

    let handler = t.clone()
      .set('kinetic', id)
      .attr('.label/text', label)
      .position(TX[2], hoffset)

    let consumes = accepts.map((x, idx) => {
      return p.clone()
        .set('kinetic', `input/${x}`)
        .set('tokens', state.get(x) ? 1 : 0)
        .attr('.label/text', x)
        .position(PX[2], coffset + (100 * idx))
      })
    let produces = outputs.map((x, idx) => {
      return p.clone()
        .set('kinetic', `output/${x}`)
        .attr('.label/text', x)
        .position(PX[3], poffset + (100 * idx))
    })

    graph.addCells(...consumes, ...produces, handler)

    consumes.forEach(x => graph.addCell([
      link(consume, x), link(x, handler)
    ]))
    produces.forEach((x, idx) => {
      let out = send.clone()
        .set('kinetic', `${id}/send`)
        .position(TX[3], poffset + (100 * idx))
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
      .set('kinetic', 'absorb')
      .attr('.label/text', 'absorb')
      .position(TX[1], offset)
    graph.addCell([
      absorb,
      link(core, absorb)
    ])
    for (let reactor of target.reactors) {
      let sub  = subnet.clone()
        .set('kinetic', reactor.id)
        .set('subnet', true)
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
  this.send('joint/token', V('circle', {
    r: 5, fill: '#f3b662'
  }))

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

function renderGraphToPaper(source, opts) {
  const joint = this.get('module/jointjs')
  const doc   = this.get('browser/document')

  let graph = new joint.dia.Graph
  opts = Object.assign({
    gridSize: 10,
    perpendicularLinks: true
  }, opts, { model: graph })
  let paper = new joint.dia.Paper(opts)

  if (source instanceof joint.dia.Graph)
    graph.fromJSON(source.toJSON())
  else
    graph.fromJSON(source)

  paper.fitToContent({ padding: opts.padding, allowNewOrigin: 'any' })
  this.send('joint/paper', paper)
}

// TODO: for now, we're not breaking it apart into separate reactions
// 
// once we have a way to detect/animate circular continuous flow,
// we'll break it apart into reaction triggers!
function animateReactorFlow(paper, token) {
  let reactor = this.get('render/reactor')
  let graph = paper.model
  let elements = new Map
  for (let elem of graph.getElements()) {
    let kinetic = elem.get('kinetic')
    if (!kinetic) continue
    elements.set(kinetic, elem)
  }

  reactor.on('flow', (ko, flow) => {
    console.log('flow', ko, flow)
    let seq
    // here we build the animation pipeline
    switch (flow[0]) {
    case 'feedback': seq = traceInternalFlow(ko, flow)
      break;
    case 'accept': seq = traceExternalFlow(ko, flow)
      break;
    }
    if (!seq) return // silently ignore for now
    // send iterator to the sequence

    let steps = []
    for (const step of seq) {
      steps.push( Array.isArray(step) ? step.map(x => x.attr('.label/text')) : step.attr('.label/text') )
    }
    console.log(steps.join(' -> '))
    animateFlowSequence(Array.from(seq), paper, graph, token)
  })

  function traceInternalFlow(ko, flow) {
    flow = new Set(flow)
    let sequence = new Set
    let origin = elements.get(ko.origin) // originating trigger or reactor
    if (!origin) {
      let match = reactor.reactors.find(x => x.contains(ko.origin))
      origin = elements.get(match.id)
    }
    sequence.add(origin)
    if (origin.get('subnet')) sequence.add(graph.getNeighbors(origin, {outbound: true}))
    else {
      let links = graph.getConnectedLinks(origin, {outbound: true})
      let link = links.find(l => {
        let elem = graph.getCell(l.get('target').id)
        return elem.get('kinetic') === `output/${ko.key}`
      })
      let target = graph.getCell(link.get('target').id)
      sequence.add(target)
      sequence.add(graph.getNeighbors(target, {outbound: true}))
    }
    sequence.add(elements.get('buffer'))
    if (flow.has('produce')) {
      sequence.add([ elements.get('feedback'), elements.get('produce') ])
      sequence.add([ elements.get('core'), elements.get('output') ])
    } else {
      sequence.add(elements.get('feedback'))
      sequence.add(elements.get('core'))
    }

    let consume = elements.get('consume')
    let absorb  = elements.get('absorb')
    if (flow.has('consume') && flow.has('absorb'))
      sequence.add([ consume, absorb ])
    else if (flow.has('consume'))
      sequence.add(consume)
    else if (flow.has('absorb'))
      sequence.add(absorb)

    let outputs = []
    if (flow.has('consume')) {
      let matches = graph
        .getNeighbors(consume, {outbound: true})
        .filter(x => x.get('kinetic') === `input/${ko.key}`)
      outputs.push(...matches)
    }
    if (flow.has('absorb')) outputs.push(...graph.getNeighbors(absorb, {outbound: true}))
    if (outputs.length)
      sequence.add(outputs)

    return sequence
    //fireTransition(consume, { target: `input/${ko.key}`, duration: 1000 })
    //fireTransition(absorb, { duration: 1000 })
  }

  function traceExternalFlow(ko, flow) {

  }

  function animateFlowSequence(seq, paper, graph, token) {
    let source = seq.shift()
    let target = seq.shift()
    if (!source || !target) return
    let sources = Array.isArray(source) ? source : [ source ]
    let targets = Array.isArray(target) ? target : [ target ]

    for (const src of sources) {
      const p2t = src.get('type') === 'pn.Place'
      if (p2t) {
        let tokens = src.get('tokens')
        if (tokens > 0) src.set('tokens', tokens - 1)
      }
      for (const dst of targets) {
        let link = graph
          .getConnectedLinks(dst, {inbound: true})
          .find(l => l.get('source').id === src.id)
        if (!link) continue
        let linkv = paper.findViewByModel(link)
        let tok = token.clone().node
        if (p2t) {
          linkv.sendToken(tok, 1000)
          animateFlowSequence([dst].concat(seq), paper, graph, token)
        } else {
          linkv.sendToken(tok, 1000, () => {
            dst.set('tokens', dst.get('tokens') + 1)
            // add slight delay after token incremented before
            // continuing animation
            setTimeout(() => {
              animateFlowSequence([dst].concat(seq), paper, graph, token)
              if (!seq.length && dst.get('subnet'))
                dst.set('tokens', dst.get('tokens') - 1)
            }, 500)
          })
        }
      }
    }
  }

  // TODO: this event should be handled differently...
  reactor.on('fire', trigger => {
    console.log('fire', trigger)
    let t = elements.get(trigger.id)
    fireTransition(t, { duration: 500 })
  })

  // nested function inside since we don't want recursive animations
  function fireTransition(t, opts) {
    let { target, duration = 1000 } = opts
    let inbound = graph.getConnectedLinks(t, {inbound: true})
    let sources = inbound.map(link => graph.getCell(link.get('source').id))
    let isReady = sources.every(p => p.get('tokens') > 0)
    if (!isReady) {
      //console.log('transition not ready: ', t.get('kinetic'))
      if (sources.length === 1) {
        let source = sources[0]
        source.once('change', () => {
          //console.log('detected change ', source.get('kinetic'))
          if (source.get('tokens') > 0)
            setTimeout(() => fireTransition(t, opts), 500)
        })
      }
      return
    }

    let outbound = graph.getConnectedLinks(t, {outbound: true})
    let targets = outbound.map(link => graph.getCell(link.get('target').id))
    if (target) targets = targets.filter(p => p.get('kinetic') === target)
    
    sources.forEach(p => {
      let link = inbound.find(l => l.get('source').id === p.id)
      let tokens = p.get('tokens')
      if (tokens > 0) p.set('tokens', tokens - 1)
      paper.findViewByModel(link).sendToken(token.clone().node, duration)
    })
    targets.forEach(p => {
      let link = outbound.find(l => l.get('target').id === p.id)
      paper.findViewByModel(link).sendToken(token.clone().node, duration, () => {
        p.set('tokens', p.get('tokens') + 1)
      })
    })
  }
}

// TODO: below shouldn't be needed

function collectReactors(reactor) {
  this.fetch('reactors').set(reactor.label, reactor)
}

function renderReactorByName(name) {
  const reactors = this.fetch('reactors')
  if (reactors.has(name)) this.send('render/reactor', reactors.get(name))
  else this.warn('no such reactor:', name)
}

