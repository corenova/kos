# User's Guide

This documentation provides information on interacting with
[Kinetic Reactor](./intro.md#kinetic-reactor) modules.

## Getting Started

The quickest way to get started with **KOS** is to use the provided
`kos` CLI utility to interact with various
[available reactors](../README.md#available-reactors) included in the
**KOS** project repository.

### kos -h

```
  Usage: kos [options] [command] <reactors...>

  Commands:

    list|ls            List locally available reactors
    show|sh <reactor>  Show detailed information about a reactor

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -i, --input <file>    load KSON file(s) as initial input(s)
    -t, --trigger <kson>  feed arbitrary KSON trigger(s)
    -s, --silent          suppress all debug/info/warn/error log messages
    -v, --verbose         enable more verbose output
```

The `kos` utility internally uses the [engine](../reactors/engine.md)
reactor to dynamically load reactor modules from the local filesystem.

### kos show

The `show` command provides a visual rendering of a reactor module.

```bash
$ kos show engine
├─ name: engine
├─ purpose: Provides KOS engine load/start reactions
├─ requires
│  ├─ module/path
│  ├─ stdio
│  └─ module/fs
├─ triggers
│  ├─ ƒ(loadReactor)
│  ├─ ƒ(chainReactor)
│  ├─ ƒ(pipelineIO)
│  └─ ƒ(startEngine)
└──┐
   ├┬╼ module/path ╾┬╼ ƒ(loadReactor)  ╾─╼ reactor
   │└╼ load        ╾┘
   ├─╼ reactor     ╾─╼ ƒ(chainReactor)
   ├─╼ stdio       ╾─╼ ƒ(pipelineIO)
   │┌╼ stdio       ╾┐
   └┼╼ module/fs   ╾┼╼ ƒ(startEngine)
    └╼ start       ╾┘
```

It's a handy way to extract useful information regarding data objects
that the reactor `requires`, the various `triggers` contained inside
the reactor, as well as `inputs` and `outputs` for each of the
reactions.

## Loading Reactors








## Using Flows

First, let's start with a **simple** scenario of making a web request
and getting back the result. We'll be utilizing one of the built-in
flow module ([kos-flow-http](../flows/http.md)) for this exercise.

```js
const kos = require('kos')
const HttpFlow = kos.load('kos/flows/http')
HttpFlow
  .on('http/response/body', data => console.log(data))
  .feed('module/superagent', require('superagent'))
  .feed('http/request/get/url', 'http://www.google.com')
```

The above example illustrates how you can interact with a **Flow**
created using the `kos` library. You `feed` the **Stream** with a
*named input* `http/request/get/url` and handle the resulting *named
output* `http/response/body`. Underneath the hood, a number of
**Action(s)** are triggered until you get back the *named data* of
interest.

## Chaining Reactors

There are **two** primary ways for building data pipelines across
multiple reactors: hierarchical or 
building data pipelines or embedding as a subflow.

### Building Data Pipelines

This is the common pattern for using existing flows. As discussed in
the prior section, we'll take a look at how we can automate fulfilling
the [kos-flow-http](../flows/http.md) module's dependency on
`module/superagent` by using [kos-flow-require](../flows/require.md)
module.

```js
const kos = require('kos')
const RequireFlow = kos.load('kos/flows/require')
const HttpFlow = kos.load('kos/flows/http')
// make a data pipeline
RequireFlow.pipe(HttpFlow)
// make RequireFlow aware of NPM and then have it require superagent
RequireFlow
  .feed('require/npm')
  .feed('require/superagent')
// now you can utilize HttpFlow
HttpFlow
  .on('http/response/body', data => console.log(data))
  .feed('http/request/get/url', 'http://www.google.com')
```

## Multiple DataFlow Instances

For simple use cases, having just one instance of a KOS dataflow
pipeline may be sufficient.

However, you may need to have multiple instances within your
application to manage separate dataflow transactions or to wire up the
flows differently than originally defined.

Continuing from the [Using Multiple Flows](#using-multiple-flows)
above, let's say you just want to re-use the `HttpFlow` without the
other flows being associated.

```js
let myHttpFlow = new HttpFlow
```

You can also do `HttpFlow()`, which is equivalent to `new
HttpFlow`. This effectively creates a new instance of the KOS dataflow
without any of the pre-existing `pipe` relationships.

With your own instance of `HttpFlow`, you can add additional flow
rules, or `pipe` it to other flows without affecting the original
`HttpFlow`:

```js
let myRequireFlow = new RequireFlow
myRequireFlow.pipe(myHttpFlow)
myHttpFlow
  .in('http/response').bind(function foo(msg) {
    // do something
  })
```
