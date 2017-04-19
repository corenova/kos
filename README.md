# Kinetic Object Stream

Simple, unopionated,
[dataflow streaming](https://en.wikipedia.org/wiki/Dataflow) framework
for creating
[autonomic](https://en.wikipedia.org/wiki/Autonomic_Computing) data
pipelines and state machines for your apps.

It's a framework based on **data-centric**
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming)
paradigm that dynamically responds to *objects* in motion through a
pipeline of computational actors that can execute concurrently.

Conduct [data science](https://en.wikipedia.org/wiki/Data_science)
experiments, [share your reactors](./docs/sharing.md), and
[embrace KOS](./docs/benefits.md).

<!---
  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
--->

## Introduction

The **KOS** framework enables dataflow transactions to be expressed as
a set of discrete atomic *trigger(s)* that *automatically* executes
based on varying inputs it observes from its incoming flow of data
objects.

One of the most important construct in **KOS** is that the *reactive*
functions are **never explicitly called** by other functions.

Instead, the respective functions are invoked automatically when its
input states are *eventually* satisfied. Its operating behavior is
very similar to how a **runtime garbage collector** works tirelessly
behind the scenes in a given software instance. You don't need to
explicitly tell the *garbage collector* to clean-up, it simply *reacts
autonomously* based on its environmental observations.

When you [embrace KOS](./docs/benefits.md) you are embracing **chaos**
itself by giving up your programmatic execution flow control
logic. Instead of honing your *incantation* skills and declaring the
chain of commands for fulfilling your desires, you've now become an
**alchemist**, continually experimenting with chain reactions and
tinkering with *elements* you inject into the system until you get the
desired result.

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

## Reference Guides

Since `kos` encapsulates a number of fundamentally different paradigms
for expressing software itself, it is **highly** advised that
first-time users carefully read all of the included documentation
below:

- [Why embrace KOS?](./docs/benefits.md)
- [Using Reactors](./docs/usage.md)
- [Chaining Reactors](./docs/chaining.md)
- [Creating Reactors](./docs/developer.md)
- [Discovering Reactors](./docs/discover.md)
- [Managing State](./docs/state.md)

## Available Reactors

The following reactor modules are included inside the `kos`
repository (see [reactors](./reactors)):

name | description
---  | ---
[debug](./reactors/debug.md) | 
[engine](./reactors/engine.md) | 
[http](./reactors/http.md) | 
[link](./reactors/link.md) |
[mqtt](./reactors/mqtt.md) |
[net](./reactors/net.md) |
[npm](./reactors/npm.md) |
[pull](./reactors/pull.md) |
[push](./reactors/push.md) |
[require](./reactors/require.md) |
[rest](./reactors/rest.md) |
[sync](./reactors/sync.md) |
[ws](./reactors/ws.md) |

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
