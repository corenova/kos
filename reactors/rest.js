'use strict'

const { kos = require('..') } = global

const http = require('./http')
const ws   = require('./ws')

module.exports = kos.create('rest')
  .desc('reactions to RElational State Transfer interactions with KOS reactors')
  .load(http, ws)
  .init('basePath', '/')

  .in('rest/listen')
  .out('http/listen','http/route')
  .bind(runInstance)

  .in('http/server')
  .out('ws/listen')
  .bind(runWebSocketServer)

  .in('http/server/request/get')
  .out('http/server/response')
  .bind(getReactorState)

  .in('http/server/request/put')
  .out('http/server/response')
  .bind(putReactortate)

  .in('http/server/request/delete')
  .out('http/server/response')
  .bind(deleteReactortate)

  .in('http/server/request/post')
  .out('http/server/response')
  .bind(postReactorState)

function runInstance(opts) {
  this.send('http/listen', opts)
  // Note: for now tap into the stream and "publish" every kinetic
  // object into runtime state. Should make this hierarchical...
  this.parent.on('data', token => this.post(token.key, token.value))
}

function runWebSocketServer(server) {
  this.send('ws/listen', { server })
}

function getReactorState({ req, res }) {
  let key = url2key(req.url, this.get('basePath'))
  let data = this.get(key)
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

function putReactorState({ req, res }) {
  let key = url2key(req.url, this.get('basePath'))
  this.warn('not yet supported')
}

function deleteReactorState({ req, res }) {
  let key = url2key(req.url, this.get('basePath'))
  this.warn('not yet supported')
}

function postReactorState({ req, res }) {
  let key = url2key(req.url, this.get('basePath'))
  let io = this.parent.io()
  io.write(key + ' ')
  req.pipe(io)
  res.statusCode = 203
  res.end()
}

function url2key(url, base) {
  return url.replace(new RegExp('^'+base), '')
}
