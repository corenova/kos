'use strict'

const { kos = require('kos') } = global

const lifecycle = {
  componentWillMount:        "react:mounting",
  componentDidMount:         "react:mounted",
  componentWillUnmount:      "react:unmounting",
  componentWillUpdate:       "react:updating",
  componentDidUpdate:        "react:updated",
  componentWillReceiveProps: "react:receive"
}

module.exports = kos.create('react')
  .desc('reactions to React lifecycle events')
  .init({ lifecycle })

  .pre('kos:parent')
  .in('react:mounting')
  .bind(mount)

  .pre('kos:parent')
  .in('react:unmounting')
  .bind(unmount)

  .pre('kos:parent')
  .in('component')
  .out('react:*')
  .bind(wrap)

function mount() {
  const parent = this.get('kos:parent')
  parent.join(kos.core)
}

function unmount() {
  const parent = this.get('kos:parent')
  parent.leave(kos.core)
}

function wrap(component) {
  const [ parent, lifecycle ] = this.get('kos:parent', 'lifecycle')
  const { state, setState, trigger } = component // remember originals

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
    return () => this.reactor.send(key, ...args)
  }

  // treat 'state' and 'setState' specially
  parent.save(state, { emit: false })
  component.setState = function (obj, ...rest) {
    parent.save(obj, { emit: false })
    return setState.call(component, obj, ...rest)
  }
  // override to compute 'state' from parent reactor
  Object.defineProperty(component, 'state', {
    get() { 
      let obj = Object.create(null)
      for (let [k,v] of parent.state) obj[k] = v
      return obj
    },
    set(obj) {
      parent.init(obj)
    }
  })
  // call the original setState
  parent.on('save', setState.bind(component))
}

