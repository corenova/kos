# KOS User's Guide

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

### Managing Dependencies

An **important** concept here is that the
[superagent](http://npmjs.com/package/superagent) library for
transacting the HTTP Client requests is being *fed* into the flow by
the consumer of the `Flow`. What this means is that the Flow
**dependency** is resolved dynamically and can be updated dynamically
by the consumer on-demand. In fact, it doesn't even have to be the
actual `superagent` module itself, only something that provides
similar API interfaces that the `superagent` module provides.

The de-coupling of *module dependencies* from the flow module package
enables fluid runtime resolution and adaptation.

You can also check out [kos-flow-require](../flows/require.md) module
which automates package installation and provides the `module/*`
output. The next section will describe how it can be *combined* with
other flows such as [kos-flow-http](../flows/http.md) module.

## Using Multiple Flows

There are **two** primary ways of working with multiple flows:
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
