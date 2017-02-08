const kos = require('..')

const ReactFlow = kos.flow
  .label('kos-flow-react')
  .require('module/react')
  .in('module/react').out('react/element').bind(createElement)
  .in('react/components').out('react/component').bind(
    let components = msg.value ? []
    for (let c of components)
      this.send('react/component', c)
  })
  .in('react/component').out('*').bind(createComponent)

function createElement(msg) {
  let React = this.pull('module/react')
  let { createElement, createClass } = React
  React.createElement = (type, config={}, children) => {
    let { wrap } = this.pull(type) || {}
    if (!wrap) return createElement(...arguments)
    let props = Object.assign(config, wrap(config))
    let elem = createElement(type, props, children)
    this.send('react/element', elem)
    return elem
  }
}

function createComponent(msg) {
  let React = this.pull('module/react')
  let component = msg.value
  if (component instanceof React.Component) {

  } else {
    handler = class extends React.Component {
      render() { return component(this.state) }
    }
  }
  this.send(component, handler)
}
