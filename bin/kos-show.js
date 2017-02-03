#!/usr/bin/env node
'use strict'
let program = require('commander')

const path = require('path')
const render = require('../lib/render')

program
  .option('--json ', 'output JSON format')
  .option('--yaml ', 'output YAML format')
  .parse(process.argv)

let flows = program.args
for (let flow of flows) {
  try { 
	flow = require(flow) 
  } catch (e) { 
	flow = require(path.resolve(flow))
  }
  console.info(render(flow))
}
