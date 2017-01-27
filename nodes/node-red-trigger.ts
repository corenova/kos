import Kos from 'kos'
import React from 'react'
import Schema from 'node-red.yang'

export const TriggerNode = Schema.in('grouping(trigger)').bind({
  label() {
	if (this.name) { return this.name }
	if (this.duration > 0) {
	  return `Trigger ${this.duration}${this.units}`
	} else {
	  return `Trigger Blocked`
	}
  },

  duration() {
	return ( {
	  ms:   this.content
	  sec:  this.content * 1000,
	  min:  this.content * 1000 * 60,
	  hour: this.content * 1000 * 60 * 60
	} )[ this.units ] || this.content
  },

  exec(msg) {
	let m2;
	{ RED, reset, op1, op2, op1type, op2type, duration, extend } = this

	if (msg.hasOwnProperty('reset') || (reset && msg.payload == reset)) {
	  clearTimeout(this.timeout);
	  this.timeout = null;
	  this.status({});
	  return;
	}

	let transmitter = (msg) => () => {
      if (op2type) {
        var msg2 = RED.util.cloneMessage(msg);
        if (op2type === "flow" || op2type === "global") {
          m2 = RED.util.evaluateNodeProperty(op2,op2type,this,msg);
        }
        msg2.payload = m2;
        this.send(msg2);
      }
      this.timeout = null;
      this.status({});
	}
	let isTemplate = (data) => { return (typeof data === 'string' && data.indexOf('{{') != -1) }

    if (!this.timeout && (this.timeout !== 0)) {
      if (op2type === "pay" || op2type === "payl") { m2 = msg.payload; }
      else if (isTemplate(op2)) { m2 = mustache.render(op2, msg); }
      else if (op2type !== "nul") {
        m2 = RED.util.evaluateNodeProperty(op2,op2type,this,msg);
      }

      if (op1type === "pay") { }
      else if (isTemplate(op1)) { msg.payload = mustache.render(op1,msg); }
      else if (op1type) {
        msg.payload = RED.util.evaluateNodeProperty(op1,op1type,this,msg);
      }

      if (op1type) { this.send(msg); }

      if (duration === 0) { this.timeout = 0; }
      else {
        this.timeout = setTimeout(transmitter(msg), duration);
      }
      this.status({fill:"blue",shape:"dot",text:" "});
    } else {
      if (op2type === "payl") { m2 = msg.payload; }
	  if (extend && duration > 0) {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(transmitter(msg), duration);
      } 
	}
  },

  edit() {
	
  },

  save() {

  }
})

export const TriggerView = Schema.in('react:component(Trigger)')({

  render()

})
