# User's Guide

This documentation provides information on interacting with
[Kinetic Reactor](./intro.md#kinetic-reactor) modules utilizing the
`kos` CLI utility.

The `kos` utility provides an **interactive-prompt** interface for
*feeding* a running instance of the `kos` process. You can think of
`kos` similarly to `node`, with the key difference being that instead
of interacting with the JavaScript Runtime, you are interacting with
the [Kinetic Runtime](./intro.md#kinetic-runtime). You can also use `kos`
*non-interactively* by supplying various arguments during the
execution of the CLI utility.  See [kos --help](#kos-help) for more
details.

## Getting Started

The quickest way to get started with **KOS** is to run the `kos`
program and start interacting with it.

```
$ kos
kos>
load       load/path  process    program    prompt     reactor
read       require    show       .info      .help      .quit 
```

The above output is generated when you press `<TAB>` for
auto-completion after entering the `kos` interactive shell.

When you start the `kos` utility from the console, the
[run](../reactors/run.md) reactor is loaded as one of the reactors for
the initial **KOS** operating environment.  The
[run](../reactors/run.md) reactor provides runtime context reactions
to the Node.js `process` object as well as `program` object that
captures the CLI arguments.  It's worth taking the time to fully
understand how the [run](../reactors/run.md) reactor works.

A typical operating lifecycle for an instance of `kos` is to
[load](#loading-reactors) one or more reactors, then to
[send](#sending-tokens) one or more data tokens to trigger reactions
on the *loaded* reactors.

The first **data token** you typically supply into the
[Kinetic Runtime](./intro.md#kinetic-runtime) instance is the `load`
token in order to [load](#loading-reactors) additional reactors into
itself from the local filesystem.

## Loading Reactors

Using **KOS** you can dynamically `load` reactors into itself at any time.

The `kos` utility allows you to pass in one or more reactors as
arguments during instantiation:

```
$ kos sync http
kos> 
http/listen          http/request         http/request/get     http/route
http/server          http/server/request  link/stream          load
load/path            process              program              prompt 
reactor              read                 require              show
sync/connect         sync/listen          .info                .help 
.quit 
```
The above example issued `load "sync"` and `load "http"` during the
startup initialization of the `kos` program.

You can also `load` after entering the `kos` interactive shell (see
[Sending Tokens](#sending-tokens)):

```
$ kos
kos> load "sync"
kos> load "http"
kos>
```

As you `load` more reactors into **KOS**, the runtime automatically
attains additional *reactions* that it can perform.  Pressing `<TAB>`
from the prompt gives you a listing of currently possible **tokens**
that the runtime can react to.

The ability to `load` additional reactors from the local file system
at any time provides **KOS** with *unbounded* adaptive
characteristics. The `load` token can also be sent to the **KOS**
instance from a remote source.

From the `kos>` prompt, you can also use the `.info` command to check
the state of all internally loaded reactors at any time.

## Sending Tokens

When you interact with the `kos>` prompt, you are sending **data
tokens** that the underlying
[Kinetic Runtime](./intro.md#kinetic-runtime) can react to.  If you
send in a **token** that it doesn't recognize, you will get back an
*error* token as a response.

The **data token** in the `kos` interactive prompt is expressed using
**KSON** (Kinetic Stream Object Notation).  It is basically JSON but
*prefixed* with a single *token string* which is used as a **label**
to describe the data.

Here are some examples of KSON expressions (where `foo` is the token
keyword):

```
foo "bar" // valid
foo { } // valid
foo [ ] // valid
foo { "bar": true } // valid

foo bar // invalid
foo 'bar' // invalid (JSON does not recognize single quote strings)
foo // invalid
```

When you send a **data token** with a specific label, every
[Kinetic Reactor](./intro.md#kinetic-reactor) that includes a
*trigger* for that particular *token* will process that *token* and
attempt to fire a *reaction trigger function*.

## Triggering Reactions

By the time the `kos>` prompt shows up after starting `kos`, there's
already been several *reactions* that have taken place inside the KOS
runtime.

The [run](../reactors/run.md) reactor has already processed the
`process` and `program` data tokens that have been **fed** into the
`kos` instance by the [kos](../bin/kos.js) CLI script when you
executed the `kos` command. These initial data tokens then triggered a
**chain reaction** producing additional data tokens that fired various
[Kinetic Trigger](./intro.md#kinetic-trigger) operations such as:

```
process -> ƒ(initialize) -> reactor
program, process -> ƒ(start) -> load, read, show, prompt
load -> ƒ(loadReactor) -> reactor
reactor -> ƒ(requireReactor) -> require
require -> ƒ(tryRequire) -> module/*
prompt, process -> ƒ(promptUser) -> render
```

Basically, the `kos>` prompt that you see after starting `kos` was
produced as one of the *reactions* by the [run](../reactors/run.md)
reactor when it recognized that the current `process` data token
contained `stdin.isTTY === true`. In addition, it was successfully
produced because the current running system was also able to `require
"readline"` and produce the `module/readline` data token (which is a
condition for executing the `f(promptUser)` trigger with the `prompt`
data token).  You can learn more about how the
[run](../reactors/run.md) operates by reviewing the reactor's
documentation.

The `kos>` prompt itself is simply another *dataflow interface* for
which you can supply additional **data tokens** into the currently
running [KOS runtime].

### Example using HTTP reactor

A simple example trigger you can exercise from the `kos>` prompt is
using the [http](../reactors/http.md) reactor.

```bash
kos> load "http"
kos> http/request/get "google.com"
```

You first [load](#loading-reactors) the [http](../reactors/http.md)
which enables the [KOS Runtime](./intro.md#kinetic-runtime) with HTTP
related *reactions* and then [send](#sending-tokens) the
`http/request/get` data token with the target URL as the data value.

You should get back something like the following:

```
http/request|8664239b-7f3f-497b-9d51-e4219f059074 {"url":"google.com","method":"GET"}
http/response|691b045e-3ad7-4562-8ed3-3090277cd2d0 { ... some large JSON data }
```

The `http/request/get` data token triggers *two* reactions:

```
http/request/get -> f(simpleGet) -> http/request
http/request -> f(clientRequest) -> http/response
```

The first reaction simply formulates the `http/request/get` data token
into a common `http/request` data token object.

The second reaction then performs the actual HTTP Client async
transaction, producing `http/response` object if successful.

The [http](../reactors/http.md) can be used directly as shown above
within a given [Kinetic Runtime](#kinetic-runtime) instance, but its
primary role is to be used by other
[Kinetic Reactor](#kinetic-reactor) modules for performing HTTP
related reactions *internally* as part of a larger workflow.

## CLI Reference

Below are collection of `kos` utility options that you can use when
starting the `kos` program.

### kos --help

```
  Usage: kos [options] <reactors...>

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -e, --expr <kson>  eval KSON expression and feed into KOS
    -d, --data <file>  feed KSON file contents into KOS
    -s, --show         print detailed info about reactor(s)
    -v, --verbose      enable more verbose output
    --silent           suppress all debug/info/warn/error log messages
```

The `kos` command-line utility internally uses the
[run](../reactors/run.md) reactor to dynamically load reactor modules
from the local filesystem.

### kos --show

The `--show` option provides a visual rendering of a reactor module.

The below output was generated by performing *introspection* of the
[run](../reactors/run.md) reactor used by the `kos` utility.

```bash
$ kos --show run
run: reactions to runtime context
├─ id: 2ca7c5a6-730a-4481-b93f-fd42ed9825a0
├─ requires
│  ├─ module/fs
│  ├─ module/path
│  ├─ module/readline
│  ├─ module/treeify
│  ├─ process
│  └─ show
├─ reactors
│  └─ render
├─ triggers
│  ├─ ƒ(initialize)
│  ├─ ƒ(start)
│  ├─ ƒ(promptUser)
│  ├─ ƒ(loadReactor)
│  ├─ ƒ(updateLoadPath)
│  ├─ ƒ(tryRequire)
│  ├─ ƒ(readKSONFile)
│  ├─ ƒ(requireReactor)
│  └─ ƒ(renderReactor)
└──┐
   ├─ render: reactions to visually render KOS reactors
   │  ├─ id: 0db2c61c-6e5e-41d9-9dce-37356e84d5d1
   │  ├─ requires
   │  │  └─ module/treeify
   │  ├─ triggers
   │  │  ├─ ƒ(render)
   │  │  ├─ ƒ(renderReactorAsTree)
   │  │  └─ ƒ(outputTreeReactor)
   │  └──┐
   │     ├─╼ render         ╾─╼ ƒ(render)              ╾┬╼ render/reactor
   │     │                                              └╼ render/output
   │     ├┬╼ module/treeify ╾┬╼ ƒ(renderReactorAsTree) ╾─╼ reactor/tree
   │     │└╼ render/reactor ╾┘
   │     └┬╼ reactor/tree   ╾┬╼ ƒ(outputTreeReactor)
   │      └╼ render/output  ╾┘
   │
   ├─╼ process         ╾─╼ ƒ(initialize)     ╾─╼ reactor
   │                                          ┌╼ load
   ├┬╼ program         ╾┬╼ ƒ(start)          ╾┼╼ read
   │└╼ process         ╾┘                     ├╼ show
   │                                          └╼ prompt
   │┌╼ process         ╾┐
   ├┼╼ module/readline ╾┼╼ ƒ(promptUser)     ╾─╼ render
   │└╼ prompt          ╾┘
   ├┬╼ module/path     ╾┬╼ ƒ(loadReactor)    ╾─╼ reactor
   │└╼ load            ╾┘
   ├─╼ load/path       ╾─╼ ƒ(updateLoadPath)
   ├─╼ require         ╾─╼ ƒ(tryRequire)     ╾─╼ module/*
   ├┬╼ module/fs       ╾┬╼ ƒ(readKSONFile)
   │└╼ read            ╾┘
   ├─╼ reactor         ╾─╼ ƒ(requireReactor) ╾─╼ require
   │┌╼ process         ╾┐
   └┼╼ show            ╾┼╼ ƒ(renderReactor)  ╾─╼ render
    └╼ reactor         ╾┘
```

Using the `--show` option, you can easily extract useful information
regarding data objects that the reactor `requires`, the various
`triggers` and `reactors` contained inside the reactor, as well as
`inputs` and `outputs` for each of the reactions.
