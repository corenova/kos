const { kos = require('kos') } = global

const lifecycle = {
  componentWillMount:        "react:mounting",
  componentDidMount:         "react:mounted",
  componentWillUnmount:      "react:unmounting",
  componentWillUpdate:       "react:updating",
  componentDidUpdate:        "react:updated",
  componentWillReceiveProps: "react:receive"
}

module.exports = kos.create('react-state-machine')
  .desc('reactions to React lifecycle events')
  .init({ lifecycle })

  .in('react:mounting').bind(function() { 
    this.reactor.parent.join(kos) 
  })
  .in('react:unmounting').bind(function() { 
    this.reactor.parent.leave(kos)
  })

  .in('component')
  .out('react:*','*')
  .bind(wrapComponent)

function wrapComponent(component) {
  const lifecycle = this.get('lifecycle')
  const { state, setState, trigger } = component // remember originals
  const source = this.reactor.parent

  // allow all lifecycle events to emit an internal event
  for (let event in lifecycle) {
    let f = component[event], label = lifecycle[event]
    component[event] = (...args) => {
      this.send(label, args)
      if (f) return f.apply(component, args)
    }
  }
  // attach a convenience function for trigger
  component.trigger = (key, ...args) => {
    return this.send.bind(this, key, ...args)
  }

  // treat 'state' and 'setState' specially
  source.save(state, { emit: false })
  component.setState = function (obj, ...rest) {
    source.save(obj, { emit: false })
    return setState.call(component, obj, ...rest)
  }
  // override to compute 'state' from source reactor
  Object.defineProperty(component, 'state', {
    get() { 
      let obj = Object.create(null)
      for (let [k,v] of source.state) obj[k] = v
      return obj
    },
    set(obj) {
      source.init(obj)
    }
  })
  // call the original setState
  source.on('save', setState.bind(component))
}

