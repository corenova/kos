'use strict'

const kos = require('./node')
const DebugPersona = require('./persona/debug')
const LinkPersona  = require('./persona/link')
const HttpPersona  = require('./persona/http')
const SyncPersona  = require('./persona/sync')
const PullPersona  = require('./persona/pull')
const PushPersona  = require('./persona/push')
const ReactPersona = require('./persona/react')
const WebSocketPersona = require('./persona/ws')

export default kos
export { 
  DebugPersona, 
  LinkPersona, 
  HttpPersona, 
  WebSocketPersona, 
  SyncPersona, 
  PullPersona, 
  PushPersona, 
  ReactPersona }
