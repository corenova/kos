import kos, { sync, link, ws, render, debug } from '..'

const app = kos
  .reactor('demo', 'a demo app for visualizing KOS')
  //.embed(render)
  // fire once sync session established

  //.in('sync/stream').out('render/reactor','joint/paper/config').bind(renderRemoteReactors)

function renderRemoteReactors(stream) {
  this.send('render/reactor', sync)
  this.send('joint/paper/config', { target: 'main' })
}

// setup the reactor chain
app.chain(sync, render, debug)

// feed the app with init tokens
app
  .feed('debug/config', { verbose: 3 })
  .feed('browser/document', document) // we're running on a web browser
  .feed('module/url', require('url'))
  .feed('module/simple-websocket', require('simple-websocket'))
  .feed('module/jointjs', require('jointjs'))
  .feed('joint/paper/config', { target: 'main' })
  .feed('render/reactor', sync, link, ws)
  //.feed('sync/connect', 'ws:localhost:8080')

// NOTE: Once sync connects, everything you feed into the core will
// go to every reactor


// TODO: use React to provide layout

// import React from 'react'
// import ReactDOM from 'react-dom'
// // import { Router, Route, IndexRoute, browserHistory } from 'react-router'
// ReactDOM.render((
//   <div>test</div>
// ), document.getElementById('main'))

//import 'bootstrap-loader'
//import 'styles/corenova.scss'


// highlight/tomorrow.css
// react-widgets.css?

// const Features = () => (<div>features</div>)
// const Projects = ({children}) => (<div>{children}</div>)

// import App from 'components/App'
// import Home from 'scenes/Home'
// import { ProjectContainer, ProjectTimeline, ProjectPulse } from 'scenes/Project'

// render((
//   <Router history={browserHistory}>
// 	<Route path="/" component={App}>
// 	  <IndexRoute component={Home} />
// 	  <Route path="/features" component={Features} />
// 	  <Route path="/projects" component={Projects}>
// 	    <Route path="/project/:id" component={ProjectContainer}>
// 	      <IndexRoute component={ProjectTimeline} />
// 	      <Route path="timeline" component={ProjectTimeline} />
// 	      <Route path="pulse" component={ProjectPulse} />
// 	    </Route>
// 	  </Route>
// 	</Route>
//   </Router>
// ), document.getElementById('main'));
