const { kos = require('..') } = global

module.exports = kos.reactor('react')
  .in('module/react').out('react/element').bind(createElement)
  .in('react/component').and.has('module/react').bind(registerComponent)

function createElement(React) {
  let { createElement, createClass } = React
  React.createElement = (type, config={}, children) => {
    let { wrap } = this.fetch(type) || {}
    if (!wrap) return createElement(...arguments)
    let props = Object.assign(config, wrap(config))
    let elem = createElement(type, props, children)
    this.send('react/element', elem)
    return elem
  }
}

function createComponent(component) {
  let React = this.fetch('module/react')
  if (component instanceof React.Component) {

  } else {
    handler = class extends React.Component {
      render() { return component(this.state) }
    }
  }
  this.send(component, handler)
}
