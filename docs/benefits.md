# Why embrace KOS?

[Chaos Theory](https://en.wikipedia.org/wiki/Chaos_theory) was
summarized by [Edward Lorenz](https://en.wikipedia.org/wiki/Edward_Norton_Lorenz) as:

: When the present determines the future, but the approximate present does not approximately determine the future

In as much as we'd like to believe otherwise, our software systems
misbehave in ways we cannot predict. No matter how throughly we
attempt to define, analyze, and test our systems, we invariably fail
to sufficiently control all the possible ways it can go wrong.

The **KOS** framework adopts the
[reactive programming](https://en.wikipedia.org/wiki/Reactive_programming)
paradigm and combines
[event-driven programming](https://en.wikipedia.org/wiki/Event-driven_programming)
together with *asynchronous*
[dataflow programming](https://en.wikipedia.org/wiki/Dataflow_programming)
paradigms.

The resulting framework provides a structured methodology for defining
discrete atomic *reactive functions* that represents system bahavior
as a dynamic state machine composed from a collection of cohesive
actors that collaborate over a distributed network.

In other words, **KOS** is a system designed to continuously react to
changes in its environment, where the environment itself (its network
of distributed actors) effectively determines how it can react to
changes.

This means that you can introduce any additional *reactive* behavior
into an operating environment at any time while it is **actively
running**. Basically, it has *inherent* facility to self-modify its
own system behavior.

Using **KOS** you can design and implement
[autonomic computing](https://en.wikipedia.org/wiki/Autonomic_Computing)
systems that can manage itself without direct human intervention.

> Intelligence is the ability to adapt to change
>
> - Stephen Hawking

## Relations to Imperative Approach

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

## Relations to Object-Oriented Approach

When we take an
[object-oriented](https://en.wikipedia.org/wiki/Object-oriented_programming)
approach to defining system behavior, we reduce global state variance
by localizing scope of operating behavior to logical *objects*, but at
the cost of carrying heavy baggage of the entire system's complex
taxonomy of entities. Because state is now bound to the *object* for
which operations take effect and these *objects* are often
hierarchical and relational to other *objects*, tracing the execution
flow of a given system often requires peeling many layers of an onion
**and** all of its friends. An *object* extracted out of context
becomes meaningless.

With **KOS**, the 
