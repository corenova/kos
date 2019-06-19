'use strict'

require('yang-js')

module.exports = require('./kinetic-react-js.yang').bind({

  // Bind Processor reactions
  Component: {
    transform(target) {
      const lifecycle = {
        componentWillMount:        "mounting",
        componentDidMount:         "mounted",
        componentWillUnmount:      "unmounting",
        componentWillUpdate:       "updating",
        componentDidUpdate:        "updated",
        componentWillReceiveProps: "receive"
      }
      const { props, state, setState } = target

      this.state.merge(state, { suppress: true }); // update initial state
      this.state.clean(); // mark initial state to be unchanged

      // override target to compute 'state' from this
      Object.defineProperty(target, 'state', {
        configurable: true,
        get: () => { return this.state },
        set: (obj) => { /* noop */ }
      })
      
      // override target setState to update this state
      target.setState = obj => this.state.merge(obj, { deep: false });

      // allow all lifecycle events to emit an internal event
      let active = false;
      for (let event in lifecycle) {
        const f = target[event], state = lifecycle[event]
        target[event] = (...args) => {
          switch (state) {
          case 'mounting':
          case 'mounted':
            active = true; break;
          case 'unmounting':
            active = false; break;
          }
          this.send('react:lifecycle', { active, state, args })
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
      this.state.on('update', prop => {
        prop.changed && this.send('react:state', prop.change)
      });
      props && this.send('react:props', props)
      setState && this.send('react:setter', setState.bind(target))
    },
    history(props) {
      const { history } = props
      if (!history) return
      history.listen((location, action) => this.send('react:route', { location, action }))
      this.send('react:route', { location: history.location, action: history.action });
      this.send('react:history', history);
    },
    applyState(lifecycle, setter, state) {
      if (lifecycle.active) setter(state);
    },
  },

  Form: {
    saveFormData(event) {
      const { target={} } = event
      let { type, name, value } = target
      if (!name) return
      if (type === 'checkbox') {
        value = target.checked;
      }
      target.classList.remove('is-valid');
      target.classList.remove('is-invalid');
      
      // filter out '' empty string
      value = !!value ? value : undefined;
      try {
        this.state.merge(objectify(name, value));
        if (value !== undefined)
          target.classList.add('is-valid');
        target.setCustomValidity('');
      } catch (e) {
        this.state.merge(objectify(name, value), { bypass: true });
        target.classList.add('is-invalid');
        target.setCustomValidity(e.message);
      }
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
      this.debug('clearing form state', keys)
      form.reset()
    }
  }
})
