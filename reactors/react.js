const { kos = require('kos') } = global

module.exports = kos.create('react-state-machine')
  .desc('reactions to React lifecycle events')
  .init('lifecycle', {
    componentWillMount:   "react:mounting",
    componentDidMount:    "react:mounted",
    componentWillUnmount: "react:unmounting",
    componentWillUpdate:  "react:updating",
    componentDidUpdate:   "react:updated"
  })
  .in('react:mounting').bind(function() { 
    this.reactor.parent.join(kos) 
  })
  .in('react:unmounting').bind(function() { 
    this.reactor.parent.leave(kos)
  })

  .in('react:component')
  .out('react:*')
  .bind(wrapComponent)

function wrapComponent(component) {
  const lifecycle = this.get('lifecycle')
  const { state={}, setState } = component
  const source = this.reactor.parent

  // allow all lifecycle events to emit an actual event
  for (let event in lifecycle) {
    let f = component[event], label = lifecycle[event]
    component[event] = (...args) => {
      this.send(label, true)
      if (f) return f.apply(component, args)
    }
  }
  // treat 'state' and 'setState' specially
  source.init(state)
  component.setState = function (obj, ...rest) {
    source.init(obj)
    return setState.call(component, obj, ...rest)
  }
  Object.defineProperty(component, 'state', {
    get() { 
      let obj = Object.create(null)
      for (let [k,v] of source.state) obj[k] = v
      return obj
    },
    set(obj) {
      source.state.clear()
      source.init(obj)
    }
  })
  source.on('save', setState.bind(component))
}

