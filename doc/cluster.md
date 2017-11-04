# Distributed KOS

This documentation provides information on using `kos` as a
distributed computing cluster.

Since every instance of [Kinetic Runtime](./intro.md#kinetic-runtime)
is essentially a [Kinetic Reactor](./intro.md#kinetic-reactor) that
can dynamically *load* one-or-more reactors, we can dynamically build
a distributed network of kinetic reactors that can adaptively learn
about each other and enable dynamic flows of
[Kinetic Token](./intro.md#kinetic-token) to propagate throughout the
network.

The **KOS** framework comes with a number of
[available reactors](../README.md#available-reactors) designed
specifically for providing distributed networking facilities.

The [pull](../reactors/pull.md) and [push](../reactors/push.md)
reactors provide reactions to enable uni-directional
[Kinetic Token](./intro.md#kinetic-token) flows across instances.

The [sync](../reactors/sync.md) reactor provides the essential
reactions to create a topology of
[Kinetic Runtime](./intro.md#kinetic-runtime) instances that
synchronizes [Kinetic Token](./intro.md#kinetic-token) flows across
instances.

For the purpose of discussing various distributed computing cluster
models, we'll focus mainly on using the [sync](../reactors/sync.md)
reactor.

## Full Stack

Since the **KOS** framework is written in JavaScript, enabling
seamless **dataflow integration** between the web browser client and
the backend Node.js server is fairly straight-forward.

When using [sync](../reactors/sync.md) reactor to establish a dataflow
stream between a web browser client and the backend, we utilize the
[ws](../reactors/ws.md) reactor for `WebSocket` based communications.

For a quick example on a **full stack** setup, you can also check out
the [todo app](../examples/todo) inside the [examples](../examples)
folder.

### KOS on the server

On the server side, you can simply use the `kos` utility as follows:

```
$ kos -e 'sync/listen "ws://localhost:3000"' sync
```

Alternatively, you can manually feed in the necessary tokens via the
interactive prompt:

```
$ kos
kos> load "sync"
kos> sync/listen "ws://localhost:3000"
```

You can also programatically use the [sync](../reactors/sync.md)
reactor:

```js
const kos = require("kos")
const sync = require("kos/reactors/sync")
kos
  .load(sync)
  .feed('sync/listen', 'ws://localhost:3000')
```

In general, using reactors on the Node.js instance is just a matter of
loading the desired reactor and feeding it with desired data tokens.

### KOS on the client

On the client side, since you don't have the benefit of the `kos`
utility, you will need to directly `import/require` the
[Kinetic Runtime](./intro.md#kinetic-runtime) inside the web
application (e.g. [kos.min.js](../dist/kos.min.js)) and *load* the
[sync](../reactors/sync.md) reactor module into the runtime instance.

Here's the complete client-side workflow:

```js
import kos, { sync } from 'kos'
kos
  .load(sync)
  .feed('module/url', require('url'))
  .feed('module/simple-websocket', require('simple-websocket'))
  .feed('sync/connect', "ws://localhost:3000")
```

The above snippet will establish a synchronous `WebSocket` dataflow
stream between the web client application and a backend `WebSocket`
instance listening on `localhost:3000`.

Let's take a closer look at each of the **data tokens** being *fed*
into the `kos` runtime.

#### Feeding module/* tokens

```js
kos
  .feed('module/url', require('url'))
  .feed('module/simple-websocket', require('simple-websocket'))
```

Since the web browser does not have `require/import` capabilities for
dynamically resolving dependency library modules from the local
filesystem, you must supply the `module/*` data tokens explicitly
inside a web client application so that the application builders such
as [browserify](http://browserify.org) and
[webpack](http://webpack.js.org) can bundle the necessary dependencies
when generating the client-side web application.

The `url` and the `simple-websocket` modules are needed by the
[sync](../reactors/sync.md) reactor in order to perform reactions for
establishing `WebSocket` connections.

In the future, we can introduce a new reactor using a web service
(such as [unpkg](https://unpkg.com)) to enable dynamic module
dependency resolution within the web client browser. Volunteers are
welcome for contributing such reactor. :-)

#### Feeding sync/connect token

```js
kos.feed('sync/connect', "ws://localhost:3000")
```

The above `sync/connect` data token triggers the following
[chain reaction](./intro.md#chain-reactions) using the
[link](../reactors/link.md) and [ws](../reactors/ws.md) reactors:

```
sync/connect -> f(sync:syncConnect) -> link/connect/url
link/connect/url -> f(link:connectByUrl) -> link/connect
link/connect -> f(link:connect) -> ws/connect
ws/connect -> f(ws:connect) -> ws/socket, link
link -> f(link:createLinkStream) -> link/stream
link/stream -> f(sync:syncStream) -> sync
```

Please note that the `sync/connect` reaction will continuously retry
connection attempts to the specified endpoint. You don't need to have
the `sync/listen` endpoint active before *feeding* the `sync/connect`
token (i.e. it's ok to start the client before the server).

### Synchronization between server/client

So, what does it mean once you have a [sync](../reactors/sync.md)
reactor active between the server and the client in a full stack
scenario?

Synchronization in **KOS** enables the participating instances to
exchange their *local* reactors with each other. By making their
*locally* loaded reactors made known to other party, it allows the
other party to trigger reactions as if those reactors were also
locally available to itself.

For example, if the server instance had the
[http](../reactors/http.md) reactor loaded, then from the web client
instance, it can [send](./usage.md#sending-tokens) the
`http/request/get` token and have the `http/response` data token
produced by the server instance flow back to itself as if the actual
reaction took place inside the client instance.

From the web client, it can even trigger a *reaction* to the server
instance to have it **dynamically load** the
[http](../reactors/http.md) reactor:

```js
kos.feed('load', 'http')
```

Such ability is made possible for the web client instance because when
it *synchronized* with the server instance, it discovered the
[run](../reactors/run.md) reactor from the server instance which
contains a reactive trigger for the `load` data token.

In theory, we should also be able to trigger `require` data token and
retrieve the respective `module/*` response from the server instance,
but for now, dataflow propagation of `module/*` data tokens is blocked
between instances due to JSON serialization challenges for Node.js
modules with `require` dependencies to other modules. Once again,
volunteers are welcome for exploring this reaction. :-)

The key takeaway in understanding [sync](../reactors/sync.md) behavior
is this: **KOS synchronizes the *state machine* of each instance and NOT
the actual state of each instance.**

### Limitations of the web client

The **KOS** instance running on the web client has limited options
when establishing network relationships with other **KOS**
instances. For one, it is not possible to have it *listen* for new
connections. It is also unable to make direct TCP/UDP based
connections using the [net](../reactors/net.md) reactor.

However, it is fully capable of joining as many server endpoints as it
wants and in turn act as a synchronization link across multiple
disparate [hive clusters](#hive-mind) that are accessible via the
connected server endpoints.

## Hive Mind

The **KOS** framework was designed from the ground up to streamline
the creation of a *distributed* **neural network**.

One of the closest definition for a **Hive Mind** from wikipedia is
that of
[Swarm Intellignce](https://en.wikipedia.org/wiki/Swarm_intelligence):

> Swarm Intelligence is the collective behavior of decentralized,
> self-organized systems, natural or artifical. SI systems consist
> typically of a population of simple agents or boids interacting
> locally with one another and with their environment. The inspiration
> often comes from nature, especially biological systems. The agents
> follow very simple rules, and although there is no centralized
> control structure dictating how individual agents should behave,
> local, and to a certain degree random, interactions between such
> agents lead to the emergence of "intelligent" global behavior,
> unknown to the individual agents.

When you build a network of **KOS** instances using the
[sync](../reactors/sync.md) reactor, you are effectively creating a
[Swarm Intellignce](https://en.wikipedia.org/wiki/Swarm_intelligence)
system, where each individual instance contributes its own local
limited reactive facilities which when combined together as a whole
leads to the emergence of "intelligent" global behavior.

However, a key difference of **KOS** from the classic SI definition is
that **KOS** also embraces the
[Autonomic Computing](https://en.wikipedia.org/wiki/Autonomic_Computing)
paradigm, which effectively makes each of the participating agents
also become aware of the emerging "intelligent" global behavior.

What that means is that while the **Hive Mind** itself is formed by
and operates like a SI system, every participating *agent* also
becomes capable of individually behaving and acting like the
**collective intelligence** even after it gets *pruned* from the
network it once belonged to.

Basically, using the [sync](../reactors/sync.md) reactor, each *agent*
learns ALL of the reactive facilities of the cluster it joins and can
then perform ALL of the reactions provided by the cluster even after
being disonncected from the cluster.  Also, once the disconnected
*agent* rejoins the cluster, it automatically resumes *delegating* the
reactions accordingly back to the cluster and continues to serve only
those reactions that were *previously local* to itself.

Please do try this at home. It's awesome.
