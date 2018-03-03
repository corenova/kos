'use strict';

const Yang = require('yang-js')

class Model extends Yang.Model {

  constructor(schema) {
    super(schema.tag, schema)
  }

}
