import kos, { sync, link, ws, render, debug } from '..'

const app = kos.reactor('demo')
  .desc('a demo app for visualizing KOS')
  .load(sync, render)

  .in('show').and.has('browser/document')
  .out('dom/element','joint/paper/config','render/reactor')
  .bind(renderSelf)

  .in('joint/paper')
  .out('render/reactor')
  .bind(userActivity)

  // fire once sync session established
  //.in('sync/stream').out('render/reactor','joint/paper/config').bind(renderRemoteReactors)

function renderSelf(opts) {
  const doc = this.get('browser/document')
  let { target } = opts

  this.send('dom/element', doc.getElementById(target))
  this.send('joint/paper/config', {
    gridSize: 10,
    interactive: false,
    padding: 5
  })
  this.send('render/reactor', app)
}

function userActivity(paper) {
  this.debug('making paper interactive')

  paper.on('cell:pointerdblclick', (view) => {
    console.log(view)
    this.debug(view)
  })
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
  .feed('show', { target: 'main' })

  //.feed('sync/connect', 'ws:localhost:8080')

// NOTE: Once sync connects, everything you feed into the core will
// go to every reactor


