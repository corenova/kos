'use strict'

const { kos = require('..') } = global
const requireReactor = require('./require')
const httpReactor = require('./http')
const wsReactor = require('./ws')
const linkReactor = require('./link')

module.exports = kos
  .reactor('run', 'Provides runtime flow state management')
  .chain(requireReactor, httpReactor, wsReactor, linkReactor)

  .setState('base', '/')

  .in('run').out('http/listen','http/route').bind(runInstance)
  .in('http/server').out('ws/listen').bind(runWebSocketServer)

  .in('http/server/request/get').out('http/server/response').bind(getFlowState)
  .in('http/server/request/put').out('http/server/response').bind(putFlowState)
  .in('http/server/request/delete').out('http/server/response').bind(deleteFlowState)
  .in('http/server/request/post').out('http/server/response').bind(postFlowState)

function runInstance(opts) {
  this.send('http/listen', opts)
  // Note: for now tap into the stream and "publish" every kinetic
  // object into runtime state. Should make this hierarchical...
  this.stream.on('data', ko => this.post(ko.key, ko.value))
}

function runWebSocketServer(server) {
  this.send('ws/listen', { server })
}

function getFlowState({ req, res }) {
  let key = url2key(req.url, this.fetch('base'))
  let data = this.fetch(key)
  res.statusCode = data ? 200 : 404
  if (data) {
    res.setHeader('Content-Type', 'application/json')
    try { res.write(JSON.stringify(data)) }
    catch (err) {
      res.statusCode = 500
      res.statusMessage = err.message
    }
  }
  // TODO: make it chainable later
  //this.send('http/server/response', res)
  res.end()
}

function putFlowState({ req, res }) {
  let key = url2key(req.url, this.fetch('base'))
  this.warn('not yet supported')
}

function deleteFlowState({ req, res }) {
  let key = url2key(req.url, this.fetch('base'))
  this.warn('not yet supported')
}

function postFlowState({ req, res }) {
  let key = url2key(req.url, this.fetch('base'))
  let io = this.stream.io()
  io.write(key + ' ')
  req.pipe(io)
  res.statusCode = 203
  res.end()
}

function url2key(url, base) {
  return url.replace(new RegExp('^'+base), '')
}
