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

  .pre('parent')
  .in('react:mounting')
  .bind(mount)

  .pre('parent')
  .in('react:unmounting')
  .bind(unmount)

  .pre('parent')
  .in('component')
  .out('react:*')
  .bind(wrap)

function mount() {
  const parent = this.get('parent')
  parent.join(kos)
}

function unmount() {
  const parent = this.get('parent')
  parent.leave(kos)
}

function wrap(component) {
  const [ parent, lifecycle ] = this.get('parent', 'lifecycle')
  const { state, setState, trigger } = component // remember originals

  // allow all lifecycle events to emit an internal event
  for (let event in lifecycle) {
    let f = component[event], label = lifecycle[event]
    component[event] = (...args) => {
      this.send(label, args)
      if (f) return f.apply(component, args)
      return component
    }
  }
  // attach a convenience function for trigger
  component.trigger = (key, ...args) => {
    this.debug(component, 'register trigger', key)
    this.out(key) // register the 'key' as one of output topics
    return (evt) => {
      args.length ? this.send(key, ...args) : this.send(key, evt)
    }
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
      for (let [k,v] of parent.map) obj[k] = v
      return obj
    },
    set(obj) {
      parent.init(obj)
    }
  })
  // call the original setState
  parent.on('save', setState.bind(component))
}

