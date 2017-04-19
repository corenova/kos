# Kinetic Object Stream

Simple, unopionated,
[dataflow streaming](https://en.wikipedia.org/wiki/Dataflow) framework
for creating
[autonomic](https://en.wikipedia.org/wiki/Autonomic_Computing) data
pipelines and state machines for your apps.

It's a **data-centric**
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

> For example, in an *imperative* programming setting, `a:=b+c` would
> mean that `a` is being assigned the result of `b+c` in the instant
> the expression is evaluated, and later, the values of `b` and `c`
> can be changed with no effect on the value of `a`. However, in
> reactive programming, the value of `a` would be automatically
> updated whenever the values of `b` and `c` change, without the
> program executing the sentence `a:=b+c` again.

Here's an example for expressing the `a:=b+c` logic as a *reactive
program* using `kos`:

```js
const kos = require('kos')
const example = kos.reactor('example')
  .desc('An example reactor that computes "b+c" to produce "a"')
  .in('b','c').out('a').bind(doAddition)
  .in('a').bind(printResult)
// define the reactive functions
function doAddition(b, c) {
  this.send('a', b + c)
}
function printResult(a) {
  console.log(`current value of a is: ${a}`)
}
```

In the above example, we've created a new
[Kinetic Reactor](./lib/reactor.js) that *will trigger* a simple
arithmetic addition when it observes *both* inputs labeled `b` and `c`
to produce a new output labeled `a`.  In addition, we express a simple
**chain reaction** that will trigger once `a` is observed within the
reactor to print its value to the console.

We can then explicitly trigger the reactions by *feeding* the reactor
instance with input objects:

```js
example.feed('b', 10) // nothing happens, missing 'c'
// provide 'c' 5 seconds later
setTimeout(() => {
  example.feed('c', 5) // the "doAddition" function executes!
  // you should see the result "15" printed on console
}, 5000)
```

As you feed *additional* input objects, you will see the resulting `a`
update automatically:

```js
example.feed('b', 100) // resulting "a" is now 105
example.feed('c', 50)  // resulting "a" is now 150
```

The key construct here is that in
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming),
the reactive functions are **never explicitly called**.

To put it another way, there are no programmatic statements to invoke
the `doAddition` and `printResult` functions. Instead, the respective
functions are invoked automatically when its input conditions are
*eventually* satisfied. Its operating behavior is similar to how a
**runtime garbage collector** works tirelessly behind the scenes in a
given software instance. You don't explicitly tell the *garbage
collector* to clean-up, it simply *reacts autonomously* based on its
environmental observations.

When you [embrace KOS](./docs/benefits.md) you are embracing **chaos**
itself by giving up your programmatic execution flow control
logic. Instead of honing your *incantation* skills and declaring the
chain of commands for fulfilling your desires, you've now become an
**alchemist**, continually experimenting with chain reactions. And
then... you irreversibly fall in love with your new art form.

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
- [Managing State](./docs/state-machine.md)

## Available Reactors

The following reactor modules are included inside the `kos`
repository (see [reactors](./reactors)):

- [debug](./reactors/debug.md)
- [engine](./reactors/engine.md)
- [http](./reactors/http.md)
- [link](./reactors/link.md)
- [mqtt](./reactors/mqtt.md)
- [net](./reactors/net.md)
- [npm](./reactors/npm.md)
- [pull](./reactors/pull.md)
- [push](./reactors/push.md)
- [require](./reactors/require.md)
- [rest](./reactors/rest.md)
- [sync](./reactors/sync.md)
- [ws](./reactors/ws.md)

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
