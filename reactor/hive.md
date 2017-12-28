# hive reactor

This reactor provides reactions to p2p link communications.

Source code is available [here](./hive.js).

## Usage

```js
const HiveReactor = require('kos/reactor/hive')
```

## kos --show hive

```
hive: reactions to p2p hive communications
├─ id: 87267d28-e496-423f-a2e8-afd1e695cb4d
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/net
│  ├─ module/simple-websocket
│  ├─ module/simple-websocket/server
│  └─ module/url
├─ reactors
│  └─ link
├─ reactions
│  ├─ ƒ(connect)
│  ├─ ƒ(listen)
│  └─ ƒ(peer)
└──┐
   ├─ link: reactions to stream dynamic client/server links
   │  ├─ id: e033cd1e-c100-40cc-8a5f-cf268d4a0c38
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  ├─ module/net
   │  │  ├─ module/simple-websocket
   │  │  ├─ module/simple-websocket/server
   │  │  └─ module/url
   │  ├─ reactors
   │  │  ├─ net
   │  │  └─ ws
   │  ├─ reactions
   │  │  ├─ ƒ(connect)
   │  │  ├─ ƒ(listen)
   │  │  ├─ ƒ(connectByUrl)
   │  │  ├─ ƒ(listenByUrl)
   │  │  └─ ƒ(link)
   │  └──┐
   │     ├─ net: reactions to establish TCP/UDP client/server communication links
   │     │  ├─ id: d34a01eb-7d50-4c43-98ab-1a196e71f633
   │     │  ├─ passive: false
   │     │  ├─ enabled: true
   │     │  ├─ depends
   │     │  │  ├─ module/net
   │     │  │  └─ module/url
   │     │  ├─ reactions
   │     │  │  ├─ ƒ(connect)
   │     │  │  ├─ ƒ(listen)
   │     │  │  ├─ ƒ(connectByUrl)
   │     │  │  └─ ƒ(listenByUrl)
   │     │  └──┐
   │     │     ├┬╼ module/net      ╾┬╼ ƒ(connect)      ╾┬╼ connection
   │     │     │└╼ net/connect     ╾┘                   └╼ net/socket
   │     │     │┌╼ module/net      ╾┐                   ┌╼ connection
   │     │     ├┴╼ net/listen      ╾┴╼ ƒ(listen)       ╾┼╼ net/socket
   │     │     │                                        └╼ net/server
   │     │     ├┬╼ module/url      ╾┬╼ ƒ(connectByUrl) ╾─╼ net/connect
   │     │     │└╼ net/connect/url ╾┘
   │     │     └┬╼ module/url      ╾┬╼ ƒ(listenByUrl)  ╾─╼ net/listen
   │     │      └╼ net/listen/url  ╾┘
   │     │
   │     ├─ ws: reactions to establish WebSocket client/server communication links
   │     │  ├─ id: 00c94b87-8a06-41d6-a400-7c2298d082cd
   │     │  ├─ passive: false
   │     │  ├─ enabled: true
   │     │  ├─ depends
   │     │  │  ├─ module/simple-websocket
   │     │  │  ├─ module/simple-websocket/server
   │     │  │  └─ module/url
   │     │  ├─ reactions
   │     │  │  ├─ ƒ(connect)
   │     │  │  ├─ ƒ(listen)
   │     │  │  ├─ ƒ(connectByUrl)
   │     │  │  └─ ƒ(listenByUrl)
   │     │  └──┐
   │     │     │┌╼ module/simple-websocket        ╾┐                   ┌╼ ws/socket
   │     │     ├┴╼ ws/connect                     ╾┴╼ ƒ(connect)      ╾┼╼ connection
   │     │     │                                                       └╼ ws/connect
   │     │     │┌╼ module/simple-websocket/server ╾┐                   ┌╼ ws/server
   │     │     ├┴╼ ws/listen                      ╾┴╼ ƒ(listen)       ╾┼╼ ws/socket
   │     │     │                                                       └╼ connection
   │     │     ├┬╼ module/url                     ╾┬╼ ƒ(connectByUrl) ╾─╼ ws/connect
   │     │     │└╼ ws/connect/url                 ╾┘
   │     │     └┬╼ module/url                     ╾┬╼ ƒ(listenByUrl)  ╾─╼ ws/listen
   │     │      └╼ ws/listen/url                  ╾┘
   │     │
   │     │                                                       ┌╼ net/connect
   │     ├─╼ link/connect                   ╾─╼ ƒ(connect)      ╾┼╼ ws/connect
   │     │                                                       └╼ link/connect/url
   │     │                                                       ┌╼ net/listen
   │     ├─╼ link/listen                    ╾─╼ ƒ(listen)       ╾┼╼ ws/listen
   │     │                                                       └╼ link/listen/url
   │     ├┬╼ module/url                     ╾┬╼ ƒ(connectByUrl) ╾─╼ link/connect
   │     │└╼ link/connect/url               ╾┘
   │     ├┬╼ module/url                     ╾┬╼ ƒ(listenByUrl)  ╾─╼ link/listen
   │     │└╼ link/listen/url                ╾┘
   │     └─╼ connection                     ╾─╼ ƒ(link)         ╾─╼ link
   │
   ├─╼ hive/connect                   ╾─╼ ƒ(connect) ╾─╼ link/connect
   ├─╼ hive/listen                    ╾─╼ ƒ(listen)  ╾─╼ link/listen
   └─╼ link                           ╾─╼ ƒ(peer)    ╾─╼ reactor
```
