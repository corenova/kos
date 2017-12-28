# http reactor

This reactor provides message based transaction using HTTP as a client
and/or server.

Source code is available [here](./http.js).

## Usage

```js
const HttpReactor = require('kos/reactor/http')
```

## kos --show http

```
http: reactions to HTTP client/server requests
├─ id: 19c888a9-1297-457b-a0e0-1460d07fb7a9
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/http
│  ├─ module/superagent
│  └─ module/url
├─ reactions
│  ├─ ƒ(clientRequest)
│  ├─ ƒ(simpleGet)
│  ├─ ƒ(createServer)
│  ├─ ƒ(classifyServerTransaction)
│  └─ ƒ(handleRoute)
└──┐
   ├┬╼ module/superagent   ╾┬╼ ƒ(clientRequest)             ╾─╼ http/response
   │└╼ http/request        ╾┘
   ├─╼ http/request/get    ╾─╼ ƒ(simpleGet)                 ╾─╼ http/request
   │┌╼ module/http         ╾┐                                ┌╼ http/server
   ├┼╼ module/url          ╾┼╼ ƒ(createServer)              ╾┼╼ http/socket
   │└╼ http/listen         ╾┘                                ├╼ link
   │                                                         └╼ http/server/request
   ├─╼ http/server/request ╾─╼ ƒ(classifyServerTransaction) ╾─╼ http/server/request/*
   └┬╼ http/server         ╾┬╼ ƒ(handleRoute)               ╾─╼ http/server/request
    └╼ http/route          ╾┘
```
