'use strict'

const { kos = require('..') } = global

module.exports = require('./kinetic-react-js.yang').bind({

  // Bind Components
  Component: {
    initialize,
    mount,
    unmount,
    update,
    observe
  },

  Form: {
    trigger,
    clear
  }
})

function initialize(component) {
  const lifecycle = {
    componentWillMount:        "react:mounting",
    componentDidMount:         "react:mounted",
    componentWillUnmount:      "react:unmounting",
    componentWillUpdate:       "react:updating",
    componentDidUpdate:        "react:updated",
    componentWillReceiveProps: "react:receive"
  }
  const { state, setState } = component
  
  this.send('react:setter', setState.bind(component))
  this.save(state) // update initial state

  // override component to compute 'state' from this
  Object.defineProperty(component, 'state', {
    get()    { return this.state },
    set(obj) { this.state = obj }
  })
  // override component setState to update this state
  component.setState = this.save.bind(this)

  // allow all lifecycle events to emit an internal event
  for (let event in lifecycle) {
    let f = component[event], label = lifecycle[event]
    component[event] = (...args) => {
      this.send(label, args)
      if (f) return f.apply(component, args)
      return component
    }
  }
  // attach a convenience function to observe and respond to synthetic events
  component.observe = (...args) => {
    const event = args.pop()
    const [ topic, ...data ] = args
    event.stopPropagation()
    this.send('react:event', event)
    topic && this.send(topic, ...data)
  }
  component.to = (topic, ...args) => {
    this.debug(component, 'registered', topic)
    this.out(topic) // register the 'key' as one of output topics
    return (evt) => {
      args.length ? this.send(topic, ...args) : this.send(topic, evt)
    }
  }
  this.on('save', obj => this.send('react:state', obj))
}

function mount()   { this.join(kos) }
function unmount() { this.leave(kos) }

function update(state, setter) { setter(state) }

function observe(event) {
  //const [ topic, merge ] = this.get('topic', 'module/deepmerge')
  const { target } = event
  let { type, name, value } = target
  this.debug(event, target)
  if (!name) return
  if (type === 'checkbox') {
    value = target.checked
  }
  this.save(objectify(name, value))
  
  function objectify(key, val) {
    let keys = key.split('/')
    let last, obj, root, k
    obj = root = {}
    while ((k = keys.shift())) {
      last = { root, k }
      root = root[k] = {}
    }
    last.root[last.k] = val
    return obj
  }
}

function trigger() {
  this.send('react:form-action', this.state)
}

function clear(keys) {
  const { state } = this
  this.debug('clearing form state', keys)
  this.clear(...keys)
}
