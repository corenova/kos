'use strict';

const tree = require('treeify').asTree

// TODO: need to revisit this module and tune it...

const BOX = {
  L: {
	top:  '┌╼ ',
	item: '├╼ ',
	last: '└╼ ',
	mid1: '┬╼ ',
	mid2: '┼╼ ',
	mid3: '┴╼ ',
	one:  '─╼ ',
	dash: '╼ '
  },
  R: {
	top:  ' ╾┐',
	item: ' ╾┤',
	last: ' ╾┘',
	mid1: ' ╾┬',
	mid2: ' ╾┼',
	mid3: ' ╾┴',
	one:  ' ╾─',
	dash: ' ╾'
  },
  nest: '│',
  item: '├',
  last: '└'
}

const FUNC = 'ƒ'
const SEP = ' '

function indent(str, count=1, sep=' ') {
  return str.replace(/^(?!\s*$)/mg, sep.repeat(count))
}

function findLongest(a) {
  let c = 0, d = 0, l = 0, i = a.length
  if (i) while (i--) {
	d = a[i].length
	if (d > c) {
	  l = i; c = d;
	}
  }
  return a[l]
}

function renderListItem(item, i, options={}) {
  let { width, height, isMiddle=false, left=BOX.L, right=BOX.R } = options
  let str = ''
  let label = item + SEP.repeat(width - item.length)
  if (height === 1)
	str += (left.one || '') + label + (right.one || '')
  else if (i === 0)
	if (isMiddle)
	  str += (left.mid1 || '') + label + (right.mid1 || '')
	else
	  str += (left.top || '') + label + (right.top || '')
  else if (i < height - 1)
	if (isMiddle)
	  str += (left.mid2 || '') + label + (right.mid2 || '')
	else
	  str += (left.item || '') + label + (right.item || '')
  else
	if (isMiddle)
	  str += (left.mid3 || '') + label + (right.mid3 || '')
	else
	  str += (left.last || '') + label + (right.last || '')
  return str
}

function renderAction(action, funcWidth, inputWidth, outputWidth) {
  let { inputs, outputs, handler={} } = action
  // BOX for inputs
  let inbox = {
	height: inputs.length,
	width: inputWidth || findLongest(inputs).length,
	start: 0
  }
  let funcName = handler.name || ''
  if (!funcWidth) funcWidth = funcName.length
  // BOX for outputs
  let outbox = {
	height: outputs.length,
	width:  outputWidth || findLongest(outputs).length,
	start: 0
  }
  let height = inbox.height > outbox.height ? inbox.height : outbox.height
  let block = {
	height: height,
	width: 0,
	middle: Math.floor((height - 1) / 2),
	lines: []
  }

  if (inbox.height > outbox.height) {
	outbox.start = Math.floor((inbox.height - outbox.height) / 2)
  }
  if (outbox.height > inbox.height) {
	inbox.start = Math.floor((outbox.height - inbox.height) / 2)
  }
  for (let idx=0, i=0, o=0; idx < block.height; idx++) {
	let line = ''
	if (idx >= inbox.start && i < inbox.height) {
	  line += renderListItem(inputs[i], i++, {
		height: inbox.height,
		width:  inbox.width,
		isMiddle: (idx === block.middle)
	  })
	} else {
	  line += SEP.repeat(inbox.width + 6)
	}
	if (idx === block.middle) {
	  let label = FUNC + '(' + funcName + ')' + SEP.repeat((funcWidth - funcName.length)) 
	  if (outbox.height)
		line += BOX.L.dash + label + BOX.R.dash
      else
        line += BOX.L.dash + label
	} else {
	  line += SEP.repeat(funcWidth + 7)
	}
	if (idx >= outbox.start && o < outbox.height) {
	  line += renderListItem(outputs[o], o++, {
		height: outbox.height,
		width:  outbox.width,
		right: {},
		isMiddle: (idx === block.middle)
	  })
	}
	block.lines.push(line)
	if (line.length > block.width)
	  block.width = line.length
  }
  return block
}

function renderActions(stream) {
  let { actions, inputs, outputs } = stream
  let inputWidth  = findLongest(inputs).length
  let outputWidth = findLongest(outputs).length
  let funcWidth   = findLongest(actions.map((x => x.handler.name))).length
  let lines = actions.reduce(((acc, action, idx) => {
	let item = renderAction(action, funcWidth, inputWidth, outputWidth)
	let last = idx == (actions.length - 1)
	for (let i=0; i < item.lines.length; i++) {
	  let line = item.lines[i]
	  if (i < item.middle)
		line = BOX.nest + line
	  else if (i === item.middle)
		if (last)
		  line = BOX.last + line
	    else
		  line = BOX.item + line
	  else if (last)
		line = SEP + line
	  else
		line = BOX.nest + line
	  acc.push(line)
	}
	return acc
  }), [])
  return lines.join("\n")
}

function renderStream(stream, level=1) {
  let str = ''
  let info = {
	label:    stream.label(),
	summary:  stream.summary(),
	requires: stream.requires,
	ignores:  stream.ignores,
    subflows: stream.subflows.map(x => x.label()),
    actions:  stream.actions.map(x => FUNC + '(' + x.handler.name + ')'),
    '': null
  }
  if (level > 1) delete info.label
  for (let key in info) {
	if (Array.isArray(info[key])) {
	  if (info[key].length)
		info[key] = info[key].reduce(((a,b) => { 
		  a[b] = null; return a 
		}), {})
	  else delete info[key]
	}
  }
  str += tree(info, true)
  for (let flow of stream.subflows) {
    str += '   ├─ '+flow.label()+"\n"
    str += indent(renderStream(flow, level+1), 1, '   │  ') + "\n"
    str += "   │\n"
  }
  str += indent(renderActions(stream), 3)
  return str
}

module.exports = renderStream
