# net reactor

This reactor provides reactions to TCP/UDP client/server connections.

Source code is [here](./net.js).

## Usage

```js
const NetReactor = require('kos/reactor/net')
```

## kos --show net

```
net: reactions to establish TCP/UDP client/server communication links
├─ id: 9cdd7b30-31f3-4c46-b665-2594304afe2c
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/net
│  └─ module/url
├─ reactions
│  ├─ ƒ(connect)
│  ├─ ƒ(listen)
│  ├─ ƒ(connectByUrl)
│  └─ ƒ(listenByUrl)
└──┐
   ├┬╼ module/net      ╾┬╼ ƒ(connect)      ╾┬╼ connection
   │└╼ net/connect     ╾┘                   └╼ net/socket
   │┌╼ module/net      ╾┐                   ┌╼ connection
   ├┴╼ net/listen      ╾┴╼ ƒ(listen)       ╾┼╼ net/socket
   │                                        └╼ net/server
   ├┬╼ module/url      ╾┬╼ ƒ(connectByUrl) ╾─╼ net/connect
   │└╼ net/connect/url ╾┘
   └┬╼ module/url      ╾┬╼ ƒ(listenByUrl)  ╾─╼ net/listen
    └╼ net/listen/url  ╾┘
```
