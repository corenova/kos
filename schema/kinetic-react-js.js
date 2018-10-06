'use strict'

require('yang-js')

module.exports = require('./kinetic-react-js.yang').bind({

  // Bind Generator
  Component(target) {
    const lifecycle = {
      componentWillMount:        "react:mounting",
      componentDidMount:         "react:mounted",
      componentWillUnmount:      "react:unmounting",
      componentWillUpdate:       "react:updating",
      componentDidUpdate:        "react:updated",
      componentWillReceiveProps: "react:receive"
    }
    const { state, setState } = target

    if (!Object.keys(this.state))
      this.state = state // update initial state

    // override target to compute 'state' from this
    Object.defineProperty(target, 'state', {
      get: () => { return this.state },
      set: (obj) => { this.state = obj }
    })
    
    // override target setState to update this state
    target.setState = this.save.bind(this)

    // allow all lifecycle events to emit an internal event
    for (let event in lifecycle) {
      let f = target[event], label = lifecycle[event]
      target[event] = (...args) => {
        this.send(label, args)
        if (f) return f.apply(target, args)
        return target
      }
    }

    // attach a convenience function to observe and respond to synthetic events
    target.observe = (event) => {
      event.stopPropagation()
      this.send('react:event', event)
    }
    target.trigger = (topic, data) => {
      this.send('react:trigger', { topic, data })
    }
    
    this.on('save', obj => this.send('react:state', obj))
    
    this.send('react:setter', setState.bind(target))
    this.send('react:component', target)
  }
  
}).bind({
  
  // Bind Generator reactions
  Component: {
    mount() {
      
    },
    unmount() {
      this.send('react:mounted', null)
    },
    applyState(state, setter) {
      if (typeof setter === 'function')
        setter(state)
    }
  },

  Form: {
    saveFormData(event) {
      const { target={} } = event
      let { type, name, value } = target
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
    },
    clearForm(component, keys) {
      const dom = this.use('react:dom')
      const form = dom.findDOMNode(component)
      const { state } = this
      form.reset()
      this.debug('clearing form state', keys)
      this.clear(...keys)
    }
  }
})
