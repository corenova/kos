'use strict';

try { var debug = require('debug')('kos/flow') }
catch (e) { var debug = () => {} }

const KineticStream = require('./stream')

class KineticFlow extends KineticStream {

  constructor(options) {


    super(options)

    imports  = [].concat(imports).filter(Boolean)

    this._imports = new Set

    this.import(...imports)

  }

  import(...flows) {
    for (const flow of flows.filter(Boolean)) {
      if (typeof flow === 'string') {
        // some logic to handle how it gets auto-registered
      }
    }
    return this
  }

  get imports()  { return Array.from(this._imports) }


}
