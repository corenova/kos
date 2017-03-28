import joint from 'jointjs'
import kos, { sync, http, ws } from '..'

import React from 'react'
import { render } from 'react-dom'
//import { Router, Route, IndexRoute, browserHistory } from 'react-router'

const app = kos.create('inspector')
  .in('joint/graph').bind(renderFlow)

function renderFlow(json) {
  let graph = new joint.dia.Graph
  let paper = new joint.dia.Paper({
    el: document.getElementById('main'),
    gridSize: 10,
    perpendicularLinks: true,
    interactive: false,
    model: graph
  })
  graph.fromJSON(json)
  paper.fitToContent({
    padding: 10
  })
  console.log("after component mount", json)
}

// initialize KOS triggers
kos
  .feed('log', { verbose: 3 })
  .feed('flow', sync, http, ws, app)
  .feed('module/url', require('url'))
  .feed('module/simple-websocket', require('simple-websocket'))
  .feed('sync/connect', 'ws:localhost:8080')

render((
  <div>test</div>
), document.getElementById('main'))

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
