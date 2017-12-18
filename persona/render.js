'use strict'

const { kos = require('..') } = global

module.exports = kos.create('render')
  .desc('reactions to visually render personas')
  .init({
    BOX: {
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
    },
    FUNC: 'ƒ',
    SEP: ' '
  })

  .in('render')
  .out('render/persona','render/output')
  .bind(render)

  .pre('module/treeify')
  .in('render/persona')
  .out('persona/tree')
  .bind(renderPersonaAsTree)

  .in('persona/tree','render/output')
  .bind(outputPersonaTree)

function render(opts) {
  const { source, target } = opts
  this.send('render/output', target)
  this.send('render/persona', source)
}

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
  return a[l] || ''
}

function renderListItem(item, i, options={}) {
  const [ BOX, SEP ] = this.get('BOX','SEP')
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

function renderReaction(reaction, funcWidth, inputWidth, outputWidth) {
  const [ BOX, SEP, FUNC ] = this.get('BOX','SEP','FUNC')
  const { inputs, requires, outputs, label } = reaction
  let accepts = requires.concat(inputs)
  // BOX for consumed inputs
  let inbox = {
	height: accepts.length,
	width: inputWidth || findLongest(accepts).length,
	start: 0
  }
  let funcName = label || ''
  if (!funcWidth) funcWidth = funcName.length
  // BOX for provided outputs
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
	  line += renderListItem.call(this, accepts[i], i++, {
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
	  line += renderListItem.call(this, outputs[o], o++, {
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

function renderReactions(persona) {
  const [ BOX, SEP ] = this.get('BOX','SEP')
  const { reactions, inputs, outputs } = persona
  let inputWidth  = findLongest(inputs).length
  let outputWidth = findLongest(outputs).length
  let funcWidth   = findLongest(reactions.map((x => x.label))).length
  let lines = reactions.reduce(((acc, reaction, idx) => {
	let item = renderReaction.call(this, reaction, funcWidth, inputWidth, outputWidth)
	let last = idx == (reactions.length - 1)
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
  if (!lines.length) lines.push(BOX.last + BOX.L.dash + 'no reactions')
  return lines.join("\n")
}

function renderPersona(persona) {
  const [ BOX, SEP, FUNC ] = this.get('BOX','SEP','FUNC')
  const treeify = this.get('module/treeify')
  const { id, label, purpose, passive, enabled, depends, personas, reactions, state } = persona
  let funcWidth = findLongest(reactions.map((x => x.label))).length
  let str = ''
  let info = {
    id, passive, enabled,
	depends: depends.sort(),
    personas: personas.map(x => x.label),
    reactions: reactions.map(x => FUNC + `(${x.label})`),
    // + SEP.repeat(funcWidth - x.label.length) + ` @ ${x.id}`),
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
  str += treeify.asTree(info, true)
  for (let sub of personas) {
    str += '   ├─ ' + `${sub.label}: ${sub.purpose}` + "\n"
    str += indent(renderPersona.call(this, sub), 1, '   │  ') + "\n"
    str += "   │\n"
  }
  str += indent(renderReactions.call(this, persona), 3)
  return str
}

function renderPersonaAsTree(persona) {
  const { label, purpose } = persona
  let str = `${label}: ${purpose}\n` + renderPersona.call(this, persona)
  this.send('persona/tree', str)
}

function outputPersonaTree(tree, output) { 
  output.write(tree + "\n")
  this.clear()
}
