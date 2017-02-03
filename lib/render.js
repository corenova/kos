'use strict';

const KineticStream = require('./stream')
const KineticAction = require('./action')

const BOX = {
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

function renderAction(action) {
  let { inputs, outputs, handler } = action
  let name = !handler ? '(missing)' : '('+handler.name+')'
  if (!name) name = '(anonymous)'

  let iHeight = inputs.length
  let oHeight = outputs.length
  let height = iHeight > oHeight ? iHeight : oHeight

  // first handle single input/output transform
  if (height === 1) {
	let str = ''
	str += BOX.L.one + inputs[0] + BOX.R.one
	str += BOX.L.dash + FUNC + name + BOX.R.dash
	str += BOX.L.one + outputs[0]
	return str + "\n"
  }

  let iWidth = findLogest(inputs).length
  let oWidth = findLogest(outputs).length
  let fWidth = name.length

  let middleIndex = Math.floor((height - 1) / 2)

  let iStartIndex = 0, oStartIndex = 0
  if (iHeight > oHeight) {
	oStartIndex = Math.floor((iHeight - oHeight) / 2)
  }
  if (oHeight > iHeight) {
	iStartIndex = Math.floor((oHeight - iHeight) / 2)
  }

  let lines = []
  for (let idx = 0, i = 0, o = 0; idx < height; idx++) {
	let line = ''
	if (idx >= iStartIndex && i < iHeight) {
	  let label = inputs[i] + SEP.repeat(iWidth - inputs[i].length)
	  if (iHeight === 1)
		line += BOX.L.one + label + BOX.R.one
	  else if (idx === middleIndex) {
		if (i === 0)
		  line += BOX.L.mid1 + label + BOX.R.mid1
		else if (i < iHeight -1)
		  line += BOX.L.mid2 + label + BOX.R.mid2
		else
		  line += BOX.L.mid3 + label + BOX.R.mid3
	  }
	  else if (i === 0) 
		line += BOX.L.top + label + BOX.R.top
	  else if (i === iHeight - 1)
		line += BOX.L.last + label + BOX.R.last
	  else
		line += BOX.L.item + label + BOX.R.item
	  i++
	} else {
	  line += SEP.repeat(iWidth + 6)
	}
	if (idx === middleIndex) {
	  line += BOX.L.dash + FUNC + name + BOX.R.dash
	} else {
	  line += SEP.repeat(fWidth + 5)
	}
	if (idx >= oStartIndex && o < oHeight) {
	  let label = outputs[o] + SEP.repeat(oWidth - outputs[o].length)
	  if (oHeight === 1)
		line += BOX.L.one + label
	  else if (idx === middleIndex) {
		if (o === 0)
		  line += BOX.L.mid1 + label
		else if (o < oHeight -1)
		  line += BOX.L.mid2 + label
		else
		  line += BOX.L.mid3 + label
	  }
	  else if (o === 0) 
		line += BOX.L.top + label
	  else if (o === oHeight - 1)
		line += BOX.L.last + label
	  else
		line += BOX.L.item + label
	  o++
	}
	lines.push(line)
  }
  return lines.join("\n")
}

function renderStream(stream) {
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
