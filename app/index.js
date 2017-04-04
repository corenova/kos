import kos, { sync, render, debug } from '..'

const app = kos.reactor('demo')
  .desc('a demo app for visualizing KOS')
  .load(sync, render)

  .in('render').out('render/reactor','render/paper').bind(renderApp)
  .in('connect').out('sync/connect').bind(connect)

  .in('joint/paper').and.has('render/reactor')
  .out('render/selection')
  .bind(makeInteractive)

  .in('render/selection').bind(renderSelection)
  //.in('render/transition').bind(renderTransition)

  // fire once sync session established
  //.in('sync/stream').out('render/reactor','joint/paper/config').bind(renderRemoteReactors)

function renderApp(opts) {
  let { source, target } = opts
  if (source instanceof kos.Reactor) {
    this.send('render/reactor', source)
    this.send('render/paper', {
      el: target,
      gridSize: 10,
      interactive: false,
      padding: 5
    })
  }
  // TODO: enable rendering of remote source, i.e. ws://localhost:8080
}

function connect(opts) {
  
}

function makeInteractive(paper) {
  console.log('making paper interactive')
  paper.on('cell:pointerclick', (view) => {
    this.send('render/selection', view)
  })
}

function renderSelection(view) {
  //this.debug('rendering selected view', view)
}


// enable debug reactor flow
app.pipe(debug)

// feed the app with init tokens
app
  .feed('debug/config', { verbose: 3 })
  .feed('browser/document', document) // we're running on a web browser
  .feed('module/url', require('url'))
  .feed('module/simple-websocket', require('simple-websocket'))
  .feed('module/jointjs', require('jointjs'))
  .feed('render', { 
    source: app,
    target: document.getElementById('main')
  })

  //.feed('sync/connect', 'ws:localhost:8080')

// NOTE: Once sync connects, everything you feed into the core will
// go to every reactor


