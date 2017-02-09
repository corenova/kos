# kos-flow-http

Source code is [here](./http.js).

## Usage

```js
const HttpFlow = require('kos/flows/http')
// or
const kos = require('kos')
const HttpFlow = kos.load('kos/flows/http')
```

## kos show

```
├─ label: kos-flow-http
├─ summary: Provides HTTP client and/or server flows
├─ subflows
│  ├─ kos-flow-http-client
│  └─ kos-flow-http-server
├─ actions
│  ├─ ƒ(simpleGet)
│  ├─ ƒ(extractBody)
│  └─ ƒ(proxy)
└──┐
   ├─ kos-flow-http-client
   │  ├─ summary: Provides HTTP client flows utilizing 'superagent' module
   │  ├─ requires
   │  │  └─ module/superagent
   │  ├─ actions
   │  │  ├─ ƒ(classify)
   │  │  └─ ƒ(handleRequest)
   │  └──┐
   │     │                                             ┌╼ http/request/get
   │     │                                             ├╼ http/request/post
   │     ├─╼ http/request        ╾─╼ ƒ(classify)      ╾┼╼ http/request/put
   │     │                                             ├╼ http/request/patch
   │     │                                             └╼ http/request/delete
   │     │┌╼ http/request/get    ╾┐
   │     │├╼ http/request/post   ╾┤
   │     └┼╼ http/request/put    ╾┼╼ ƒ(handleRequest) ╾─╼ http/response
   │      ├╼ http/request/patch  ╾┤
   │      └╼ http/request/delete ╾┘
   │
   ├─ kos-flow-http-server
   │  ├─ summary: Provides HTTP server flows utilizing 'express' module
   │  ├─ requires
   │  │  └─ module/express
   │  ├─ actions
   │  │  ├─ ƒ(runServer)
   │  │  └─ ƒ(handleRoute)
   │  └──┐
   │     ├─╼ http/listen    ╾─╼ ƒ(runServer)   ╾─╼ http/server
   │     └┬╼ http/server    ╾┬╼ ƒ(handleRoute) ╾─╼ http/server/request
   │      └╼ http/route     ╾┘
   │
   ├─╼ http/request/get/url ╾─╼ ƒ(simpleGet)   ╾─╼ http/request/get
   ├─╼ http/response        ╾─╼ ƒ(extractBody) ╾─╼ http/response/body
   └┬╼ http/server/request  ╾┬╼ ƒ(proxy)       ╾─╼ http/request
    └╼ http/proxy           ╾┘
```
