// MQTT transaction flow
//
// NOTE: this flow REQUIREs the 'mqtt' module and will become
// active once it receives it from the upstream (or fed by the user)
//
// Flows should actively AVOID requiring dependency modules at the
// module-level (unless part of Node.js runtime). It should be
// declared at the flow-level so that the CONSUMER of the flow can
// decide how to fulfill the necessary dependency.

const kos = require('..')

module.exports = kos.flow
  .label('kos:flow:mqtt')
  .summary("Provides MQTT transaction flow utilizing 'mqtt' module")
  .require('module/mqtt')
  .in('mqtt/connect').out('mqtt/client').bind(connect)
  .in('mqtt/connect/url').out('mqtt/connect').bind(function simpleConnect(msg) {
    this.send({ url: msg.value })
  })
  .in('mqtt/client','mqtt/subscribe').out('mqtt/subscription','mqtt/message').bind(subscribe)
  .in('mqtt/client','mqtt/message').bind(publish)

function connect() {
  let mqtt = this.pull('module/mqtt')
  let { url } = this.get('mqtt/connect')
  // TODO: should parse url and verify mqtt can connect
  let client = mqtt.connect(url)
  mq.on('connect', () => { this.send(client) })
  mq.on('error', (err) => { this.throw(err) })
}

function subscribe() {
  let { client, topic } = this.get('mqtt/client','mqtt/subscribe')
  if (!this.has('topics')) {
    this.set('topics', new Set)
  }
  let topics = this.get('topics')
  if (!client.listeners('message').length) {
    // brand new client
    client.on('message', (topic, message, packet) => {
	  if (topics.has(topic)) 
        this.send('mqtt/message', { 
          origin: client,
          topic: topic, 
          message: message, 
          package: packet 
        })
    })
    client.subscribe(Array.from(topics), null, (err, granted) => {
      if (!err) granted.forEach(x => this.send('mqtt/subscription', x))
    })
  }
  if (!topics.has(topic)) {
    // brand new topic
    topics.add(topic)
    client.subscribe(topic, null, (err, granted) => {
      if (!err) granted.forEach(x => this.send('mqtt/subscription', x))
    })
  }
}

function publish() {
  let [ client, msg ] = this.get('mqtt/client','mqtt/message')
  if (message.origin != client)
    client.publish(msg.topic, msg.message)
}
