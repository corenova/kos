# Introduction

[Chaos Theory](https://en.wikipedia.org/wiki/Chaos_theory) was
summarized by [Edward Lorenz](https://en.wikipedia.org/wiki/Edward_Norton_Lorenz) as:

> When the present determines the future, but the approximate present
> does not approximately determine the future

In as much as we'd like to believe otherwise, our software systems
*mis*behave in ways we cannot reliably predict. No matter how
vigorously we attempt to define, analyze, and test our systems, we
invariably fail to sufficiently control all the possible ways it can
go wrong.

Using **KOS** you can design and implement
[autonomic computing](https://en.wikipedia.org/wiki/Autonomic_Computing)
systems that can manage itself without direct human intervention.

> Intelligence is the ability to adapt to change
>
> Stephen Hawking

## Core Concepts

The **KOS** framework provides a structured methodology for defining
discrete atomic *reactive functions* that represents system bahavior
as a *dynamic* state machine composed from a collection of *cohesive*
actors that collaborate over a **distributed network**.

In other words, **KOS** is a system designed to continuously react to
changes in its environment, where the environment itself (the network
of *distributed* actors) effectively determines how it can react to
changes.

Essentially, it has *inherent* facility to self-modify its
own system behavior. It's also an **intrinsically chaotic** system,
where *arbitrary* outputs are *observable* and *actionable* to produce
new outputs at any point in time.

This means that you can introduce any additional *reactive* behavior
into an operating environment at any time while it is **actively
running**. 

Furthermore, **KOS** is a
[closed-loop feedback](https://en.wikipedia.org/wiki/Feedback) control
system. This means that *outputs* of the system are routed back as
*inputs* as part of a [chain of cause-and-effect](#chain-reactions) that
forms a circular loop. The framework *thrives* on the
[butterfly effect](https://en.wikipedia.org/wiki/Butterfly_effect), a
concept that small causes can have large effects.

> In chaos theory, the butterfly effect is the sensitive dependence on
> initial conditions in which a small change in one state of a
> deterministic nonlinear system can result in large differences in a
> later state.

When you work with **KOS**, you're experimenting with *chaotic*
[chain reactions](#chain-reactions). You must think like an **alchemist**
and learn to harness the power of elemental compositions.

### Chain Reactions

When a given [Pulse](#pulse) triggers a [Reaction](#reaction) which
produces additional pulses that then triggers a subsequent reaction,
we refer to such event as a **chain reaction**. There is no limit as
to the sequence of reactions that may occur as a result of a given
data token. It's also possible for a given reaction to produce more
than one type of pulse data which can initiate multiple flows of
**chain reactions** to take place in parallel. Furthermore, a given
reaction may continuously generate a stream of pulses, which can then
trigger additional reactions forever.

Especially when **KOS** is running as a *distributed*
[neural network](./cluster.md) of reactive agents, it is possible for
a very small number of *initial* data token inputs to produce
extremely large reactive outputs flowing throughout the entire
distributed computing cluster.

## Core Entities

Before you can embrace the **KOS** framework, it is important to
understand the core entities within **KOS** and their respective
roles.

### Pulse

The **Pulse** entity represents the primary encapsulation of data
objects. The *Pulse* is the main entity that flows throughout the
**KOS** data pipeline.

Every *pulse* has a **key**, which serves as the data *type* label
for the *actual* data object being transmitted. The token's key is the
**sole identifier** used for fulfilling input state condition(s) for
the *reactive* functions.

It also serves the essential role of tracing the *path* of the data
object throughout the **KOS** data pipeline. It tracks the `origin` of
the data oject and ensures that each of the [Dataflow](#dataflow)
instances in a given data pipeline *never* reacts to the same data
object more than once.

The *Pulse* are internally created to encapsulate the data object by
the underlying [Dataflow](#dataflow) instance.

You can reference the source code [here](../lib/pulse.js).

### Dataflow

The **Dataflow** entity represents the underlying data pipeline
plumbing. It extends the [Node.js](http://nodejs.org)
[stream](http://nodejs.org/api/stream.html) interface to streamline
the flow of [Pulse](#pulse).

It also provides **state management** facilities for preserving any
necessary operational context.

You can use the **Dataflow** interface to directly
[feed](./usage.md#feeding-pulse) additional labeled data objects
into the stream.

It also serves as the base class for the
[Reactor](#reactor) entity.

You can reference the source code [here](../lib/dataflow.js).

### Reaction

The **Reaction** entity represents the essence of a *reactive*
function. It extends the Javascript Function interface and enables
declarations of `inputs` that will fire the *reactive* function, data
objects that it `requires` as dependencies, as well as `outputs` that
it can generate.

It utilizes its own indepedent **state management** interface to track
the incoming flow of data objects and handles the *automatic*
execution of the *bound* function once its trigger state is satisfied.

When the *bound* function is *reactively* invoked, the function
executes with the `this` context bound to an instance of
[Context](#context).

The *reactions* are usually created as part of a [Reactor](#reactor)
declaration but can be utilized independently if desired.

You can reference the source code [here](../lib/reaction.js).

### Reactor

The **Reactor** entity represents the control interface for managing
one-or-more dataflow streams. It extends the [Dataflow](#dataflow)
interface and enables loading of one or more [Reaction(s)](#reaction)
as well as other [Reactor(s)](#reactor).

The *reactor* is a **continuously flowing** data stream. It contains
an internal `core` stream that is used to form a
[closed-loop feedback](https://en.wikipedia.org/wiki/Feedback) route
back to itself.

It's primary role is to be a *logical* container for declaring related
*reactive* functions as a cohesive aspect.

You can reference the source code [here](../lib/reactor.js).

### Runtime

The **Runtime** is a *singleton* instance of the [Reactor](#reactor)
which serves as the primary operating environment where one or more
[Reactor](#reactor) flow modules are *loaded and reacting* to the
running environment.

It's the `kos` library module itself, so when you `require("kos")` or
`import "kos"`, you are simply accessing the **Runtime** instance
itself. It operates as a `passive` reactor, which means that it allows
*passthrough* of [Pulse](#pulse) it observes directly to one or
more *loaded* [Reactor](#reactor) flow modules.

It's primary role is to represent the *logical root* container for a
given **KOS** instance as well as enabling *creation* of additional
[Reactor](#reactor) flow modules for programmatic use.

For most usage scenario, you should only have a single **Runtime**
operating inside a given application instance. Please note that
*loading* [Reactor](#reactor) modules into the **Runtime** is
completely optional. You can *load/use* other [Reactor](#reactor) flow
module instances directly without first loading them into the
**Runtime**. It's simply a matter of *convenience* to have them all
*loaded* in one place.

You can reference the source code [here](../node.js).

## Programming Paradigms

The **KOS** framework adopts the
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming)
paradigm and combines
[event-driven programming](https://en.wikipedia.org/wiki/Event-driven_programming)
together with *asynchronous*
[dataflow programming](https://en.wikipedia.org/wiki/Dataflow_programming)
paradigms.

### Reactive Programming

Let's start with an excerpt from
[wikipedia](https://en.wikipedia.org/wiki/Reactive_programming):

> In computing, **reactive programming** is an asynchronous
> programming paradigm oriented around data streams and the
> propagation of change. This means that it should be possible to
> express static (e.g. arrays) or dynamic (e.g. event emitters) data
> streams with ease in the programming languages used, and that the
> underlying execution model will automatically propagate the changes
> through the data flow.
>
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
const example = kos.create('example')
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
[Reactor](#reactor) that *will trigger* a simple
arithmetic addition when it observes *both* inputs labeled `b` and `c`
to produce a new output labeled `a`.  In addition, we express a simple
**chain reaction** that will trigger once `a` is observed within the
reactor to print its value to the console.

We can then explicitly trigger the reactions by
[feeding](./usage.md#feeding-pulse) the reactor instance with
input objects:

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

With **KOS**, you can create and compose various reactors and
reactions into the operating environment that can **pipe** the flow of
data objects between each other in a closed loop.

### Imperative Programming

When we take an
[imperative](https://en.wikipedia.org/wiki/Imperative_programming)
approach to defining system behavior, we leave no room for the
software to deviate from pre-determined execution flow. This basically
means that such software systems are at the mercy of the precognition
prowess of their creators (us).

With **KOS**, the discrete atomic functions can be declared
*imperatively* but since there is no coupling between such functions,
it maintains deterministic behavior on a per function-level without
affecting the overall program execution flow.

### Object-Oriented Programming

When we take an
[object-oriented](https://en.wikipedia.org/wiki/Object-oriented_programming)
approach to defining system behavior, we reduce global state variance
by localizing scope of operating behavior to logical *objects*, but at
the cost of carrying heavy baggage of the entire system's complex
taxonomy of entities. Because state is now bound to the *object* for
which operations take effect and these *objects* are often
hierarchical and relational to other *objects*, tracing the execution
flow of a given system often requires peeling many layers of an onion
**and** all of its friends. An *object* extracted out of context in an
[object-oriented](https://en.wikipedia.org/wiki/Object-oriented_programming)
system often becomes meaningless.

With **KOS**, the state is bound to each of the *reactive function*
and every incoming flow of data objects are treated as **immutable**
entities. There is no expectation of any state inherent in such
*objects* and no operation takes place on them (with the exception of
library objects that contain *stateless* functions). While it can
consume and produce *object-oriented* data entities, it must not rely
on its internal state across *reactive function* executions.

### Functional Programming

TBD...

### Declarative Programming

TBD...
