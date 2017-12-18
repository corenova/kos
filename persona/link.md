# link persona

This persona provides reactions to protocol-agnostic client/server
communication links.

Source code is available [here](./link.js).

## Usage

```js
const LinkPersona = require('kos/persona/link')
```

## kos --show http

```
link: reactions to stream dynamic client/server links
├─ id: 90a2b2e7-3d6a-4ab5-bea3-57ea508bc83b
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/net
│  ├─ module/simple-websocket
│  ├─ module/simple-websocket/server
│  └─ module/url
├─ personas
│  ├─ net
│  └─ ws
├─ reactions
│  ├─ ƒ(connect)
│  ├─ ƒ(listen)
│  ├─ ƒ(connectByUrl)
│  ├─ ƒ(listenByUrl)
│  └─ ƒ(link)
└──┐
   ├─ net: reactions to establish TCP/UDP client/server communication links
   │  ├─ id: 54ae9ed4-666c-442f-a4a3-9be93f55f855
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  ├─ module/net
   │  │  └─ module/url
   │  ├─ reactions
   │  │  ├─ ƒ(connect)
   │  │  ├─ ƒ(listen)
   │  │  ├─ ƒ(connectByUrl)
   │  │  └─ ƒ(listenByUrl)
   │  └──┐
   │     ├┬╼ module/net      ╾┬╼ ƒ(connect)      ╾┬╼ connection
   │     │└╼ net/connect     ╾┘                   └╼ net/socket
   │     │┌╼ module/net      ╾┐                   ┌╼ connection
   │     ├┴╼ net/listen      ╾┴╼ ƒ(listen)       ╾┼╼ net/socket
   │     │                                        └╼ net/server
   │     ├┬╼ module/url      ╾┬╼ ƒ(connectByUrl) ╾─╼ net/connect
   │     │└╼ net/connect/url ╾┘
   │     └┬╼ module/url      ╾┬╼ ƒ(listenByUrl)  ╾─╼ net/listen
   │      └╼ net/listen/url  ╾┘
   │
   ├─ ws: reactions to establish WebSocket client/server communication links
   │  ├─ id: 3f0b51f7-656c-4495-b6c9-87bc61e7cb10
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  ├─ module/simple-websocket
   │  │  ├─ module/simple-websocket/server
   │  │  └─ module/url
   │  ├─ reactions
   │  │  ├─ ƒ(connect)
   │  │  ├─ ƒ(listen)
   │  │  ├─ ƒ(connectByUrl)
   │  │  └─ ƒ(listenByUrl)
   │  └──┐
   │     │┌╼ module/simple-websocket        ╾┐                   ┌╼ ws/socket
   │     ├┴╼ ws/connect                     ╾┴╼ ƒ(connect)      ╾┼╼ connection
   │     │                                                       └╼ ws/connect
   │     │┌╼ module/simple-websocket/server ╾┐                   ┌╼ ws/server
   │     ├┴╼ ws/listen                      ╾┴╼ ƒ(listen)       ╾┼╼ ws/socket
   │     │                                                       └╼ connection
   │     ├┬╼ module/url                     ╾┬╼ ƒ(connectByUrl) ╾─╼ ws/connect
   │     │└╼ ws/connect/url                 ╾┘
   │     └┬╼ module/url                     ╾┬╼ ƒ(listenByUrl)  ╾─╼ ws/listen
   │      └╼ ws/listen/url                  ╾┘
   │
   │                                                       ┌╼ net/connect
   ├─╼ link/connect                   ╾─╼ ƒ(connect)      ╾┼╼ ws/connect
   │                                                       └╼ link/connect/url
   │                                                       ┌╼ net/listen
   ├─╼ link/listen                    ╾─╼ ƒ(listen)       ╾┼╼ ws/listen
   │                                                       └╼ link/listen/url
   ├┬╼ module/url                     ╾┬╼ ƒ(connectByUrl) ╾─╼ link/connect
   │└╼ link/connect/url               ╾┘
   ├┬╼ module/url                     ╾┬╼ ƒ(listenByUrl)  ╾─╼ link/listen
   │└╼ link/listen/url                ╾┘
   └─╼ connection                     ╾─╼ ƒ(link)         ╾─╼ link
```
