//import 'jointjs'
import kos from '..'
import { sync, debug } from '../flows'

import React from 'react'
import { render } from 'react-dom'
//import { Router, Route, IndexRoute, browserHistory } from 'react-router'

// setup KOS data pipeline
kos.pipe(sync).pipe(debug).pipe(kos)

// initialize KOS triggers
kos
  .feed('debug/level', 3)
  .feed('sync/connect', 'localhost')

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
