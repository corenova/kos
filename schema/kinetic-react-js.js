'use strict';

const Yang = require('yang-js');
const Schema = require('./kinetic-react-js.yang');

Schema.at('Component').bind({
  
  transform: async (ctx, target) => {
    const lifecycle = {
      componentWillMount:        "mounting",
      componentDidMount:         "mounted",
      componentWillUnmount:      "unmounting",
      componentWillUpdate:       "updating",
      componentDidUpdate:        "updated",
      componentWillReceiveProps: "receive"
    }
    const { props, state, setState } = target;
    const propagate = prop => {
      prop.changed && ctx.send('react:state', prop.change);
    };

    ctx.with({ suppress: true }).push(state); // update initial state

    // override target to compute 'state' from ctx
    Object.defineProperty(target, 'state', {
      configurable: true,
      get: () => ctx.data,
      set: () => undefined, // noop
    })
    
    // override target setState to update ctx
    target.setState = state => ctx.push(state);

    // allow all lifecycle events to emit an internal event
    let active = false;
    for (let event in lifecycle) {
      const f = target[event], state = lifecycle[event]
      target[event] = (...args) => {
        switch (state) {
        case 'mounting':
          ctx.on('update', propagate);
        case 'mounted':
          active = true; break;
        case 'unmounting':
          ctx.off('update', propagate);
          active = false; break;
        }
        ctx.send('react:lifecycle', { active, state, args })
        if (f) return f.apply(target, args)
        return target
      }
    }

    // attach a convenience function to observe and respond to synthetic events
    target.observe = (event) => {
      event.stopPropagation()
      ctx.send('react:event', event)
    }
    target.trigger = (topic, data) => {
      ctx.send('react:trigger', { topic, data })
    }
    props && ctx.send('react:props', props)
    setState && ctx.send('react:setter', setState.bind(target))
  },
  
  route: (ctx, props, route) => {
    const { history } = props;
    if (!history) return;
    history.push(route.to);
  },
  
  applyState: (ctx, lifecycle, setter, state) => {
    if (lifecycle.active) setter(state);
  },

});

Schema.at('Form').bind({
  
  saveFormData: (ctx, event) => {
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
      ctx.with({ deep: true }).push(objectify(name, value));
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
  
  clearForm: (ctx, component, keys) => {
    const dom = ctx.use('react:dom');
    const form = dom.findDOMNode(component);
    //const { state } = ctx;
    ctx.logDebug('clearing form state', keys)
    form.reset()
  },

});

module.exports = Schema;

