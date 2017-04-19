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

The **KOS** framework adopts the
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming)
paradigm and combines
[event-driven programming](https://en.wikipedia.org/wiki/Event-driven_programming)
together with *asynchronous*
[dataflow programming](https://en.wikipedia.org/wiki/Dataflow_programming)
paradigms.

The resulting framework provides a structured methodology for defining
discrete atomic *reactive functions* that represents system bahavior
as a *dynamic* state machine composed from a collection of *cohesive*
actors that collaborate over a distributed network.

In other words, **KOS** is a system designed to continuously react to
changes in its environment, where the environment itself (the network
of distributed actors) effectively determines how it can react to
changes.

This means that you can introduce any additional *reactive* behavior
into an operating environment at any time while it is **actively
running**. Essentially, it has *inherent* facility to self-modify its
own system behavior. It's also an **intrinsically chaotic** system,
where *arbitrary* outputs are *observable* and *actionable* to produce
new outputs at any point in time.

Furthermore, **KOS** is a
[closed-loop feedback](https://en.wikipedia.org/wiki/Feedback) control
system. This means that *outputs* of the system are routed back as
*inputs* as part of a [chain of cause-and-effect](./chaining.md) that
forms a circular loop. The framework *thrives* on
[butterfly effect](https://en.wikipedia.org/wiki/Butterfly_effect),
which is the concept that small causes can have large effects.

> In chaos theory, the butterfly effect is the sensitive dependence on
> initial conditions in which a small change in one state of a
> deterministic nonlinear system can result in large differences in a
> later state.

When you work with **KOS**, you're experimenting with *chaotic*
[chain reactions](./chaining.md). You must think like an **alchemist**
and learn to harness the power of elemental compositions.

## Relation to Reactive Programming

Let's start with an excerpt from wikipedia:

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

With **KOS**, you can create and compose various reactors and triggers
into the operating environment that can **pipe** the flow of data
objects between each other in a closed loop.

## Relation to Imperative Programming

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

## Relation to Object-Oriented Programming

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

## Relations to Functional Programming

TBD...

## Relations to Declarative Programming

TBD...
