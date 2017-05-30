# kos-reactors-mqtt

This reactor module provides message based transactions using MQTT as a
client. Server-side flow will be added soon.

For additional usage example, you can refer to
[interlink](http://github.com/corenova/interlink) for how it is
leveraged for communications across serverless infrastructures.

Source code is available [here](./mqtt.js).

## Usage

```js
const MqttFlow = require('kos/reactors/mqtt')
```

Enabling the flow:
```js
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

The command "kos show mqtt" gives the reactos and event hierarchy in the kos environment.

```
