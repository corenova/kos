'use strict'

const { kos = require('kos') } = global

module.exports = kos.create('codex')
  .desc('reactions to perform cognitive data exchange transactions')

  .pre('module/yang-js/lib/xpath')
  .pre('codex/schema')
  .pre('snmp/session')
  .pre('snmp/root/oid')
  .in('codex/get')
  .out('snmp/get')
  .bind(toSnmpRequest)
  
  .pre('codex/schema')
  .pre('snmp/root/oid')
  .in('snmp/response')
  .out('codex/data')
  .bind(fromSnmpResponse)

function toSnmpRequest(urn) {
  const xpath = this.get('module/yang-js/lib/xpath')
  const [ schema, oidRoot ] = this.get('codex/schema','snmp/root/oid')
  const target = schema.locate(urn)
  if (!target) return this.warn(`requested ${urn} not found in schema`)

  let oids = []
  let node = target, table
  let prefix = []
  let index = 0
  while (node.parent && node !== schema) {
    const { kind, parent } = node
    let pos = parent.nodes.indexOf(node)
    if (kind === 'list') {
      table = node
      prefix.unshift(1) // extra to denote list entry
    }
    prefix.unshift((pos+1))
    node = node.parent
  }
  prefix.unshift(oidRoot)
  prefix = prefix.join('.')
  if (table) {
    let elem = xpath.parse(urn)
    while (elem) {
      if (elem.filter) {
        index = elem.filter[0].tag
        break;
      }
      elem = elem.xpath
    }
    if (!index) return this.warn(`requested ${urn} does not contain table index required for '${table.datapath}'`)
  }
  if (target.nodes.length) {
    oids = walk(target)
      .reduce(flatten, [])
      .map(oid => `${prefix}.${oid}.${index}`)
  } else {
    oids.push(`${prefix}.${index}`)
  }
  if (oids.length) {
    this.debug(urn, '->', oids.length, 'OIDs')
    this.send('snmp/get', oids)
  }

  function walk(node, top=true) {
    const { kind, type } = node
    let children = node.nodes.filter(x => (!x.type || x.type.tag !== 'leafref'))
    if ((top !== true) && (kind === 'list')) return []
    if (type && type.tag === 'empty') return null
    return children.length ? children.map(walk) : 0
  }
  function flatten(a, b, idx) {
    if (b === null) return a
    if (b === 0) return a.concat(idx+1)
    let sub = b.reduce(flatten, []).map(x => (idx+1)+'.'+x)
    return a.concat(sub)
  }
}

function fromSnmpResponse(res) {
  const [ schema, oidRoot ] = this.get('codex/schema','snmp/root/oid')
  const filter = new RegExp(`^${oidRoot}(\.\\d+)+$`)
  const table = Object.create(null)
  for (let data of res) {
    let { oid, type, value } = data
    if (!filter.test(oid)) {
      this.warn('filter rejected (',oid,')')
      continue
    }
    let indexes = oid.replace(oidRoot+'.', '').split('.')
    let node = schema
    let index, list
    while (node && (index = indexes.shift())) {
      let children = node.nodes.filter(x => (!x.type || x.type.tag !== 'leafref'))
      index = parseInt(index)
      if (!index) break;
      if (!list && node.kind === 'list') {
        list = node
        continue
      }
      if (children.length) {
        node = children[index-1]
        continue
      }
      if (!indexes.length && list) {
        break
      }
    }
    if (!node) {
      this.warn(`unable to locate OID(${oid}) inside schema`)
      continue
    }
    if (type === 4 && value) {
      value = value.toString('hex')
    }
    this.debug(oid,'->',node.datapath)
    if (list && index) {
      let entries = table[list.datapath] || []
      let key = list.key.tag // must be defined in the list
      let sub = node.datapath.replace(list.datapath,'').substr(1)
      // XXX - for now, assume every sub is a direct leaf...
      this.debug(`mapping ${sub} to ${list.tag} for entry index: ${index}`)
      let exists = entries.find(x => x[key] == index) // we use '==' instead of '===' here
      if (exists) {
        exists[sub] = value
      } else {
        entries.push({
          [key]: index,
          [sub]: value
        })
      }
      table[list.datapath] = entries
    } else {
      table[node.datapath] = value
    }
  }
  for (let key of Object.keys(table)) {
    this.send('codex/data', [ key, table[key] ])
  }
}
