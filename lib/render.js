'use strict';

const KineticStream = require('./stream')
const KineticAction = require('./action')

const ACT = {
  L: {
	top:  '┌╼ ',
	item: '├╼ ',
	last: '└╼ ',
	mid1: '┬╼ ',
	mid2: '┼╼ ',
	mid3: '┴╼ ',
	one:  '─╼ ',
	dash: '─ '
  },
  R: {
	top:  ' ╾┐',
	item: ' ╾┤',
	last: ' ╾┘',
	mid1: ' ╾┬',
	mid2: ' ╾┼',
	mid3: ' ╾┴',
	one:  ' ╾─',
	dash: ' ─'
  }
}

const BOX = {
  L: {
	top: '┌'
  },
  R: {
	top: '┐'
  },
  nest: '│ '
}

const FUNC = 'ƒ'
const SEP = ' '

const ITEM = {
  key:   '─ ',
  nokey: '──┐'
}

function indent(str, count=1, sep=' ') {
  return str.replace(/^(?!\s*$)/mg, sep.repeat(count))
}

function findLogest(a) {
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
  let { width, height, isMiddle=false, left=ACT.L, right=ACT.R } = options
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

function renderAction(action) {
  let { inputs, outputs, handler } = action
  let name = !handler ? '(missing)' : '('+handler.name+')'
  if (!name) name = '(anonymous)'

  let inbox = {
	height: inputs.length,
	width: findLogest(inputs).length,
	start: 0
  }
  let outbox = {
	height: outputs.length,
	width:  findLogest(outputs).length,
	start: 0
  }
  let height = inbox.height > outbox.height ? inbox.height : outbox.height
  let block = {
	lines: [],
	height: height,
	width: 0,
	middle: Math.floor((height - 1) / 2)
  }

  if (inbox.height > outbox.height) {
	outbox.start = Math.floor((inbox.height - outbox.height) / 2)
  }
  if (outbox.height > inbox.height) {
	inbox.start = Math.floor((outbox.height - inbox.height) / 2)
  }
  for (let idx = 0, i = 0, o = 0; idx < block.height; idx++) {
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
	  line += ACT.L.dash + FUNC + name + ACT.R.dash
	} else {
	  line += SEP.repeat(name.length + 5)
	}
	if (idx >= outbox.start && o < outbox.height) {
	  line += renderListItem(outputs[o], o++, {
		height: outbox.height,
		width:  outbox.width,
		isMiddle: (idx === block.middle)
	  })
	}
	block.lines.push(line)
	if (line.length > block.width)
	  block.width = line.length
  }
  return block
}

function renderStream(stream) {
  let { actions, upstreams, downstreams } = stream
  let section = {
	height: 0,
	width: 0
  }
  let blocks = actions.map(x => {
	let block = renderAction(x)
	if (block.width > section.width)
	  section.width = block.width
	section.height += block.height
	return block
  })
  console.log(blocks)

  return stream.actions
	.map(x => renderAction(x))
	.join("\n")
}

function render(flow) {
  if (flow instanceof KineticStream) return renderStream(flow)
  if (flow instanceof KineticAction) return renderAction(flow)
  console.log("no match?")
  console.log(flow)
}

module.exports = render
