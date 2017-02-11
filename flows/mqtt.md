# kos-flow-mqtt

This flow module provides message based transactions using MQTT as a
client. Server-side flow will be added soon.

For additional usage example, you can refer to
[interlink](http://github.com/corenova/interlink) for how it is
leveraged for communications across serverless infrastructures.

Source code is available [here](./mqtt.js).

## Usage

```js
const MqttFlow = require('kos/flows/mqtt')
// or
const kos = require('kos')
const MqttFlow = kos.load('kos-flow-mqtt')
```

Enabling the flow:
```
MqttFlow
  .on('mqtt/message', ({topic, payload}) => console.log(payload))
  .feed('module/mqtt', require('mqtt'))
  .feed('module/url', require('url'))
```

Connecting to MQTT broker and subscribing to a topic:
```js
MqttFlow
  .feed('mqtt/connect/url', 'mqtt://interlink.io')
  .feed('mqtt/subscribe', 'ping')
```

Publishing a message to a topic:
```js
MqttFlow
  .feed('mqtt/message', {
    topic: 'hello',
    payload: 'world'
  ))
```

You can also publish using a more convenient format. Any string after
`mqtt/message/` is treated as the `topic` to be published.
```js
MqttFlow
  .feed('mqtt/message/hello', 'world')
```

## kos show

```
├─ label: kos:flow:mqtt
├─ summary: Provides MQTT transaction flow utilizing 'mqtt' module
├─ requires
│  ├─ module/mqtt
│  └─ module/url
├─ actions
│  ├─ ƒ(connect)
│  ├─ ƒ(simpleConnect)
│  ├─ ƒ(subscribe)
│  ├─ ƒ(publish)
│  └─ ƒ(convert)
└──┐
   ├─╼ mqtt/connect     ╾─╼ ƒ(connect)       ╾─╼ mqtt/client
   ├─╼ mqtt/connect/url ╾─╼ ƒ(simpleConnect) ╾─╼ mqtt/connect
   ├┬╼ mqtt/client      ╾┬╼ ƒ(subscribe)     ╾┬╼ mqtt/subscription
   │└╼ mqtt/subscribe   ╾┘                    └╼ mqtt/message
   ├┬╼ mqtt/client      ╾┬╼ ƒ(publish)
   │└╼ mqtt/message     ╾┘
   └─╼ mqtt/message/*   ╾─╼ ƒ(convert)       ╾─╼ mqtt/message
```
