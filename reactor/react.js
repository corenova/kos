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
  .in('component')
  .out('react:*')
  .bind(initialize)

  .pre('parent')
  .in('react:mounting')
  .bind(mount)

  .pre('parent')
  .in('react:unmounting')
  .bind(unmount)

  .pre('react:mounted')
  .in('react:state')
  .bind(update)

  .pre('parent')
  .in('react:event')
  .bind(translate)

function initialize(component) {
  const [ parent, lifecycle ] = this.get('parent', 'lifecycle')
  const { state, setState } = component

  this.save({ component, setState }) // remember original component and setState
  parent.save(state) // update initial state

  // override component to compute 'state' from parent reactor
  Object.defineProperty(component, 'state', {
    get()    { return parent.state },
    set(obj) { parent.state = obj }
  })
  // override component setState to update parent reactor
  component.setState = parent.save.bind(parent)

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
  component.observe = (event) => {
    event.stopPropagation()
    this.send('react:event', event)
  }
  component.to = (topic, ...args) => {
    this.debug(component, 'registered', topic)
    this.out(topic) // register the 'key' as one of output topics
    return (evt) => {
      args.length ? this.send(topic, ...args) : this.send(topic, evt)
    }
  }
  parent.on('save', obj => this.send('react:state', obj))
}

function mount()   { this.get('parent').join(kos) }
function unmount() { this.get('parent').leave(kos) }

function update(state) { 
  const [ component, setState ] = this.get('component', 'setState')
  setState.call(component, state)
}

function translate(event) {
  const parent = this.get('parent')
  const { target } = event
  const { type, name, value } = target
  this.debug(target)
  if (!name) return
  this.out(name)
  this.send(name, value)
}
