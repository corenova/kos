#!/usr/bin/env node
'use strict'
let program = require('commander')

const kos = require('..')
const render = require('./lib/render')

program
  .option('--json ', 'output JSON format')
  .option('--yaml ', 'output YAML format')
  .parse(process.argv)

let flows = program.args
for (let flow of flows) {
  flow = kos.load(flow)
  if (!(flow instanceof kos.Stream))
	throw new Error("unable to render incompatible flow")

  console.info(render(flow))
}

