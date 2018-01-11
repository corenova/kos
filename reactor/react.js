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
  .init({ 
    'module/deep-equal': require('deep-equal'),
    'module/deepmerge': require('deepmerge'),
    lifecycle
  })

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

  .pre('module/deep-equal')
  .pre('react:setter')
  .pre('react:mounted')
  .in('react:state')
  .bind(update)

  // .pre('parent')
  // .pre('module/deepmerge')
  // .pre('topic')
  //.out('{topic}')

  .pre('parent')
  .in('react:event')
  .bind(observe)

function initialize(component) {
  const [ parent, lifecycle ] = this.get('parent', 'lifecycle')
  const { state, setState } = component

  this.send('react:setter', setState.bind(component))
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
  component.observe = (...args) => {
    const event = args.pop()
    const [ topic, ...data ] = args
    event.stopPropagation()
    this.send('react:event', event)
    topic && this.out(topic) && this.send(topic, ...data)
  }
  component.to = (topic, ...args) => {
    this.debug(component, 'registered', topic)
    this.out(topic) // register the 'key' as one of output topics
    return (evt) => {
      args.length ? this.send(topic, ...args) : this.send(topic, evt)
    }
  }
  component.as = (topic) => {
    this.debug(component, 'registered', topic)
    this.out(topic) // register the 'key' as one of output topics
    return (elem) => {
      console.log(elem)
    }
  }
  parent.on('save', obj => this.send('react:state', obj))
}

function mount()   { this.get('parent').join(kos) }
function unmount() { this.get('parent').leave(kos) }

function update(state) { 
  const equal = this.get('module/deep-equal')
  const setter = this.get('react:setter')
  const prevState = this.get('prevState') || {}
  const keys = Object.keys(state)
  let diff = false
  for (let k of keys) {
    if (!equal(prevState[k], state[k])) {
      diff = true
      break
    }
  }
  if (diff) setter(state)
  this.set('prevState', state)
}

function observe(event) {
  const parent = this.get('parent')
  //const [ topic, merge ] = this.get('topic', 'module/deepmerge')
  const { target } = event
  const { type, name, value } = target
  this.debug(event, target)
  if (!name) return
  //this.send(topic, data)
  this.out(name)
  this.send(name, value)
  parent.save({ [name]: value })
}
