'use strict';

const Yang = require('yang-js');
const Schema = require('./kinetic-react-js.yang');

Schema.at('Component').bind({
  
  transform: (ctx, target) => {
    const lifecycle = {
      componentDidMount:         "mounted",
      componentWillUnmount:      "unmounting",
      componentDidUpdate:        "updated",
      // below deprecated react 17.x
      //componentWillMount:        "mounting",
      //componentWillUpdate:       "updating",
      //componentWillReceiveProps: "receive"
    }
    const { props, state = {}, setState } = target;
    const propagate = prop => {
      // 3 options for dealing with diff vs full data
      // 1. prop.data
      // 2. prop.toJSON()
      // 3. go through prop.changes and recompose only changed props
      if (!prop.changed) return;
      let diff = {}
      for (const changedProp of prop.changes) {
        Object.assign(diff, changedProp.toJSON(true)); 
      }
      ctx.send('react:state', diff);
    };

    ctx.merge(state, { suppress: true }); // update initial state

    // --override target to compute 'state' from ctx
    // attach 'kos' to the target component to access reactor instance
    Object.defineProperty(target, 'kos', {
      configurable: true,
      get: () => ctx,
      set: () => undefined, // noop
    })
    
    // override target setState to update ctx
    target.setState = state => ctx.with({ deep: false }).merge(state);

    // allow all lifecycle events to emit an internal event
    let active = false;
    for (let event in lifecycle) {
      const f = target[event], state = lifecycle[event]
      target[event] = (...args) => {
        switch (state) {
        case 'mounted':
          setState.call(target, ctx.data); // initialize from schema any defaults
          ctx.on('update', propagate);
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
  
  applyState: async (ctx, lifecycle, setter, state) => {
    //console.warn('APPLY REACT STATE:', lifecycle.active, state);
    if (lifecycle.active) {
      setter(state);
    }
  },

});

Schema.at('Form').bind({
  
  saveFormData: async (ctx, event) => {
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
      // enhanced to handle list key named form targets
      // name: some-list/$key/foo/bar
      // value: 12345
      // will iterate through all matching ctx.state
      // will throw error if the $key does not exist (as side-effect)
      const keys = name.split('/');
      let node = ctx;
      while (node && keys.length) {
        const key = keys.shift();
        const next = node.at(key);
        if (!next || !keys.length) {
          node.merge(objectify([ key, ...keys ].join('/'), value));
          break;
        }
        node = next;
      }
      if (value !== undefined)
        target.classList.add('is-valid');
      target.setCustomValidity('');
    } catch (e) {
      target.classList.add('is-invalid');
      target.setCustomValidity(e.message);
      // we still call setState on react component and update the value...
      const keys = name.split('/');
      let last, obj, root, k;
      obj = root = ctx.data.toJSON() || {};
      while ((k = keys.shift())) {
        last = { root, k };
        root = root[k] = root[k] || {};
      }
      last.root[last.k] = value;
      ctx.send('react:state', obj);
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

