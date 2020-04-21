'use strict';

require('yang-js');

module.exports = require('./kinetic-react-js.yang').bind({

  // Bind Kinetic Transforms
  'kos:transform(observing)': {
    activate(input, output) {
      const lifecycle = {
        componentWillMount:        "mounting",
        componentDidMount:         "mounted",
        componentWillUnmount:      "unmounting",
        componentWillUpdate:       "updating",
        componentDidUpdate:        "updated",
        componentWillReceiveProps: "receive"
      }
      const { subject, store } = input;
      const { props, state, setState } = target;

      store.merge(state, { suppress: true }); // update initial state
      store.clean(); // mark initial state to be unchanged

      // override subject to compute 'state' from store
      Object.defineProperty(subject, 'state', {
        configurable: true,
        get: () => { return store },
        set: (obj) => { /* noop */ }
      })
      
      // override subject setState to update the store
      subject.setState = obj => store.merge(obj, { deep: false });

      // allow all lifecycle events to emit an internal event
      let active = false;
      const propagate = prop => {
        prop.changed && output.state.push(prop.change);
      };
      for (let event in lifecycle) {
        const f = subject[event], state = lifecycle[event]
        subject[event] = (...args) => {
          switch (state) {
          case 'mounting':
            store.on('update', propagate);
          case 'mounted':
            active = true; break;
          case 'unmounting':
            store.off('update', propagate);
            active = false; break;
          }
          output.lifecycle.push({ active, state, args })
          if (f) return f.apply(subject, args)
          return subject
        }
      }

      // attach a convenience function to observe and respond to synthetic events
      subject.observe = (event) => {
        event.stopPropagation();
	output.event.push(event);
      }
      subject.trigger = (topic, data) => {
	output.trigger.push({ topic, data });
      }
      props && output.props.push(props);
      setState && output.setter.push(setState.bind(subject));
    }
  },
  
    route(props, route) {
      const { history } = props;
      if (!history) return;
      history.push(route.to);
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
      
      if (typeof value === 'string') {
        // filter out '' empty string
        value = !!value ? value : undefined;
      }
      try {
        this.state.merge(objectify(name, value));
        if (value !== undefined)
          target.classList.add('is-valid');
        target.setCustomValidity('');
      } catch (e) {
        target.classList.add('is-invalid');
        target.setCustomValidity(e.message);
      }
      target.reportValidity();
      
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
