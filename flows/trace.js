// Trace transactions flow
//
// Streams should actively AVOID requiring dependency modules at the
// module-level (unless part of Node.js runtime). It should be
// declared at the stream-level so that the CONSUMER of the stream can
// decide how to fulfill the necessary dependency.

const kos = require('..')

module.exports = kos.create('kos-trace')
  .summary("Provides tracing of underlying kos transactions to an observer")
  .import(kos.load('net'))
  .default('flows', new Set)
  
  .in('trace/connect').out('net/connect/url').bind(traceConnect)
  .in('net/stream').out('trace').bind(watchFlows)
  .in('kos').bind(collectFlows)

function watchFlows(flow) {
  let flows = Array.from(this.fetch('flows'))
  
}

function collectFlows(flow) {
  this.fetch('flows').add(flow)
}
