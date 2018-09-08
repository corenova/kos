'use strict'

const kos = require('./index.js')
const SyntheticLog       = require('./reactor/log')
const SyntheticLink      = require('./reactor/link')
const SyntheticHive      = require('./reactor/hive')
const SyntheticHttp      = require('./reactor/http')
const SyntheticReact     = require('./reactor/react')
const SyntheticWebSocket = require('./reactor/ws')

export default kos
export { 
  LogReactor, 
  LinkReactor, 
  HiveReactor,
  HttpReactor, 
  WebSocketReactor, 
  ReactReactor }
