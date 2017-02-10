# Kinetic Object Stream

Simple, unopionated,
[dataflow streaming](https://en.wikipedia.org/wiki/Dataflow) framework
for creating **awesome** data pipelines and state machines for your
app.

It's a **data-centric** paradigm for moving *objects* through a
pipeline of computational actors that can execute
concurrently. Conduct
[data science](https://en.wikipedia.org/wiki/Data_science)
experiments, share your flows, and embrace KOS.

<!---
  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
--->

## Introduction

A **Kinetic Object Stream** contains a **Flow** of **Action(s)**
and/or **Stream(s)** that operates on one or more *named input*
**Object(s)** to produce one or more *named output* **Object(s)**.

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

The above render was generated for [kos-flow-http](./flows/http.md)
module via `kos show` using the included `kos` CLI utility. Please
refer to [Managing Flows](./docs/CLI.md#managing-flows) documentation
for more info on utilizing the `kos` CLI utility.

## Installation

```bash
$ npm install -g kos
```

Installing this module with `-g` flag enables system-wide access to
the `kos` utility. It is the *preferred* installation method, but it's
perfectly fine to install as a local dependency.

## Reference Guides

- [Why embrace KOS?](./docs/benefits.md)
- [Managing Flows with `kos` CLI](./docs/cli.md)
- [Using Flows](./docs/usage.md)
- [Creating Flows](./docs/developer.md)
- [Managing State](./docs/state-machine.md)
- [Using KOS with React](./docs/react.md)

## Available Flows

The following flow modules are included inside the `kos` repository.

- [kos-flow-function](./flows/function.md)
- [kos-flow-http](./flows/http.md)
- [kos-flow-mqtt](./flows/mqtt.md)
- [kos-flow-npm](./flows/npm.md)
- [kos-flow-react](./flows/react.md)
- [kos-flow-require](./flows/require.md)
- ... and many more coming soon!

As discussed in
[Managing Dependencies](./docs/usage.md#managing-dependencies) section
of the [Using Flows](./docs/usage.md) guide, properly created KOS Flow
modules do NOT contain any *explicit* external module dependencies at
the module-level but instead receive them via the stream from the
upstream consumer. As such, maintaining `package.json` or publishing
the flow modules to NPM is completely optional. 

## License
  [Apache 2.0](LICENSE)

This software is brought to you by
[Corenova Technologies](http://www.corenova.com). We'd love to hear
your feedback.  Please feel free to reach me at <peter@corenova.com>
anytime with questions, suggestions, etc.

[npm-image]: https://img.shields.io/npm/v/kos.svg
[npm-url]: https://npmjs.org/package/kos
[downloads-image]: https://img.shields.io/npm/dt/kos.svg
[downloads-url]: https://npmjs.org/package/kos
