# Developer's Guide

This documentation provides information on creating new
[Reactor](./intro.md#reactor) flow modules.

NOTE: This documenation is **incomplete** and requires further work.

## Creating Reactors

An important convention when creating new KOS reactors is to **never**
contain any *explicit* external module dependencies at the
module-level of the reactor module's source code.

An **important** concept here is that the
[superagent](http://npmjs.com/package/superagent) library for
transacting the HTTP Client requests is being *fed* into the flow by
the consumer of the `Reactor`. What this means is that the Reactor
**dependency** is resolved dynamically and can be updated dynamically
by the consumer on-demand. In fact, it doesn't even have to be the
actual `superagent` module itself, only something that provides
similar API interfaces that the `superagent` module provides.

## Managing State

TBD...
