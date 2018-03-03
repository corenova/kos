'use strict';

const { kos=require('..') } = global

module.exports = require('./react.yang').bind({

  "grouping(component)": {
    state(obj) {
      return obj
    },
    setState(obj) {
      this.send('react:state', obj)
    },
    componentWillMount() {
      this.in('..').emit('mounting', ...arguments)
    },
    componentDidMount() {
      this.in('..').emit('mounted', ...arguments)
    },
    componentWillUpdate() {
      this.in('..').emit('updating', ...arguments)
    },
    componentDidUpdate() {
      this.in('..').emit('updated', ...arguments)
    },
    componentWillReceiveProps() {
      this.in('..').emit('receiving', ...arguments)
    }
  }

  Observer: {
    wrap(component) {
      const [ parent, lifecycle ] = this.get('parent', 'lifecycle')
      const { state, setState } = component

      this.send('react:setter', setState.bind(component))
      this.save(state) // update initial state

      // override component to compute 'state' from this reaction
      Object.defineProperty(component, 'state', {
        get: ()    => { return this.state },
        set: (obj) => { this.state = obj }
      })
      // override component setState to update reaction state
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
    },

    mount()   { this.join(kos) },
    unmount() { this.leave(kos) }

  }

})

