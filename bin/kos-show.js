#!/usr/bin/env node
'use strict'
let program = require('commander')

const kos = require('..')
const tree = require('treeify').asTree
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
  
  let info = {
	label:    flow._label,
	summary:  flow._summary,
	requires: flow.requires,
	ignores:  flow.ignores,
	'': null
  }
  for (let key in info) {
	if (Array.isArray(info[key])) {
	  if (info[key].length)
		info[key] = info[key].reduce(((a,b) => { 
		  a[b] = null; return a 
		}), {})
	  else delete info[key]
	}
  }
  console.info(tree(info, true).replace(/\s$/,''))
  console.info(indent(render(flow), 3))
}

function indent(str, count=1, sep=' ') {
  return str.replace(/^(?!\s*$)/mg, sep.repeat(count))
}

