'use strict';

const debug = require('debug')('kos:petri:transition')

class Transition {

  // once all inbound places are readable, it fires

  get inputs() {
    const { sources } = this
    return Promise.all(sources.map(when.bind('data')))
    function when(emitter) {
      return new Promise( resolve => emitter.once( this, resolve ) )
    }
  }

  async fire() {
    try { this.binding.apply(context, await this.inputs) }
    catch (e) { e.origin = this; debug(e); throw e }
    return this.fire()
  }
}
