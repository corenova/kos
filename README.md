# Kinetic Object Stream

Simple, adaptive,
[dataflow streaming](https://en.wikipedia.org/wiki/Dataflow) framework
for creating
[autonomic](https://en.wikipedia.org/wiki/Autonomic_Computing) data
pipelines and state machines for your apps.

It's a framework based on **data-centric**
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming)
paradigm that dynamically responds to *objects* in motion through a
pipeline of computational actors that can execute concurrently.

Conduct [data science](https://en.wikipedia.org/wiki/Data_science)
experiments, [create neural networks](./docs/cluster.md), and
[embrace KOS](./docs/intro.md).

<!---
  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
--->

## Overview

The **KOS** framework enables
[dataflow](https://en.wikipedia.org/wiki/Dataflow) transactions to be
expressed as a set of discrete atomic *trigger(s)* that
*automatically* executes based on one or more *desired* input(s) it
observes from its incoming flow of data objects.

Using **KOS**, you can create a new
[Kinetic Reactor](./docs/intro.md#kinetic-reactor) instance with one
or more [Kinetic Trigger](./docs/intro.md#kinetic-trigger) reactive
functions and **feed/pipe** a stream of
[Kinetic Token(s)](./docs/intro.md#kinetic-token) into the
reactor. The [Kinetic Reactor](./docs/intro.md#kinetic-reactor) and
[Kinetic Trigger](./docs/intro.md#kinetic-trigger) are both instances
of [Kinetic Stream](./docs/intro.md#kinetic-stream) and natively
support data streaming API (i.e. read/write).

One of the most important concept in **KOS** is that these *reactive*
trigger functions are **never explicitly called** by other functions
as part of a control flow logic. Instead, the *reactive* trigger
functions are invoked *automatically* by the **KOS** framework when
its input states are *eventually* satisfied by one or more observed
flow of data tokens. Its operating behavior is very similar to how a
[runtime garbage collector](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science))
works tirelessly behind the scenes in a given software instance. You
don't need to explicitly tell the *garbage collector* to clean-up, it
simply *reacts autonomously* based on its environmental observations.

When you [embrace KOS](./docs/intro.md) you are embracing **chaos**
itself by giving up your *programmatic* execution flow control
logic. Instead of honing your *incantation* skills and declaring the
chain of commands for fulfilling your desires, you've now become an
**alchemist**, continually experimenting with
[chain reactions](./docs/intro.md#chain-reactions) and tinkering with *tokens*
you inject into the system until you get your desired result.

Once you learn how to express and leverage the power of
[chain reactions](./docs/intro.md#chain-reactions), you can create
[neural networks](./docs/cluster.md) that **evolve** based on its
operating environment.

## Reference Guides

Since **KOS** encapsulates a number of fundamentally different
paradigms for expressing software itself, it is **highly** advised
that first-time users carefully read **all** of the included
documentation below:

- [Introduction to KOS](./docs/intro.md)
  - [Core Concepts](./docs/intro.md#core-concepts)
  - [Core Entities](./docs/intro.md#core-entities)
  - [Programming Paradigms](./docs/intro.md#programming-paradigms)
- [Using KOS](./docs/usage.md)
  - [Getting Started](./docs/usage.md#getting-started)
  - [Loading Reactors](./docs/usage.md#loading-reactors)
  - [Sending Tokens](./docs/usage.md#sending-tokens)
  - [Triggering Reactions](./docs/usage.md#triggering-reactions)
  - [CLI Reference](./docs/usage.md#cli-reference)
- [Clustering KOS](./docs/cluster.md)
  - [Full Stack](./docs/cluster.md#full-stack)
  - [Hive Mind](./docs/cluster.md#hive-mind)

The **developer's guide** to creating new reactors and understanding
the **KOS** library APIs will be coming soon! In the meantime, taking
a look at the [available reactors](#available-reactors) bundled with
the **KOS** framework should provide some indirect guidance.

## Installation

```bash
$ npm install -g kos
```

Installing this module with `-g` flag enables system-wide access to
the `kos` command-line utility. It is the *preferred* installation
method, but it's perfectly fine to install as a local dependency.

For development and running through examples, you can grab the source
repo from:

```bash
$ git clone https://github.com/corenova/kos
```

## Available Reactors

The following reactor modules are included inside the **KOS**
repository (see [reactors](./reactors)):

name | description
---  | ---
[debug](./reactors/debug.md) | reactions to send debugging messages to an output stream
[http](./reactors/http.md) | reactions to http client/server transactions
[link](./reactors/link.md) | reactions to dynamic client/server flows
[mqtt](./reactors/mqtt.md) | reactions to mqtt client/server transactions
[net](./reactors/net.md) | reactions to tcp/udp client/server transactions
[npm](./reactors/npm.md) | reactions to drive NPM operations
[pull](./reactors/pull.md) | reactions to pull dataflow from peers
[push](./reactors/push.md) | reactions to push dataflow to peers
[rest](./reactors/rest.md) | reactions to RESTful transactions
[run](./reactors/run.md) | reactions to Node.js runtime context (see [kos](./bin/kos.js) cli)
[sync](./reactors/sync.md) | reactions to sync dataflow with peers
[ws](./reactors/ws.md) | reactions to websockets client/server flows

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
