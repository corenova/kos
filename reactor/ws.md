# ws persona

This persona provides reactions to WebSocket client/server connections.

Source code is [here](./ws.js).

## Usage

```js
const WsPersona = require('kos/persona/ws')
```

## kos --show ws

```
ws: reactions to establish WebSocket client/server communication links
├─ id: dff87656-a64e-4c60-ad2a-2ad70ba402c3
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/simple-websocket
│  ├─ module/simple-websocket/server
│  └─ module/url
├─ reactions
│  ├─ ƒ(connect)
│  ├─ ƒ(listen)
│  ├─ ƒ(connectByUrl)
│  └─ ƒ(listenByUrl)
└──┐
   │┌╼ module/simple-websocket        ╾┐                   ┌╼ ws/socket
   ├┴╼ ws/connect                     ╾┴╼ ƒ(connect)      ╾┼╼ connection
   │                                                       └╼ ws/connect
   │┌╼ module/simple-websocket/server ╾┐                   ┌╼ ws/server
   ├┴╼ ws/listen                      ╾┴╼ ƒ(listen)       ╾┼╼ ws/socket
   │                                                       └╼ connection
   ├┬╼ module/url                     ╾┬╼ ƒ(connectByUrl) ╾─╼ ws/connect
   │└╼ ws/connect/url                 ╾┘
   └┬╼ module/url                     ╾┬╼ ƒ(listenByUrl)  ╾─╼ ws/listen
    └╼ ws/listen/url                  ╾┘
```
