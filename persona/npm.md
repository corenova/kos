# npm flow observer

This flow observer provides basic NPM client transactions with the NPM
registry. It enables you to install/uninstall external modules to any
given endpoint running KOS. For example, it can be used in conjunction
with [engine](./engine.md) to auto-resolve dependencies via a simple
`require "some-module"` message.

Source code is [here](./npm.js).

## Usage

```js
const npm = require('kos/flow/npm')
```

Simple example:

```js
npm
  .feed('module/npm', require('npm'))
  .feed('npm/install', 'delegates')
```

You can also send multiple packages:
```js
npm.feed('npm/install', [ 'foo', 'bar@1.0', 'etc' ])
```

Any `npm/install` messages sent while the underlying NPM subsystem is
being *initialized* will be queued and executed together as a single
command.

## kos show

```
├─ name: npm
├─ purpose: Provides NPM registry transactions utilizing 'npm' module
├─ requires
│  └─ module/npm
├─ actions
│  ├─ ƒ(triggerLoad)
│  ├─ ƒ(initialize)
│  ├─ ƒ(install)
│  ├─ ƒ(installByName)
│  ├─ ƒ(queueCommands)
│  └─ ƒ(sendCommands)
└──┐
   ├─╼ module/npm    ╾─╼ ƒ(triggerLoad)   ╾─╼ npm/load
   ├─╼ npm/load      ╾─╼ ƒ(initialize)    ╾─╼ npm:ready
   ├┬╼ npm/install   ╾┬╼ ƒ(install)       ╾─╼ npm/installed
   │└╼ npm:ready     ╾┘
   ├─╼ npm/install/* ╾─╼ ƒ(installByName) ╾─╼ npm/install
   ├─╼ npm/*         ╾─╼ ƒ(queueCommands) ╾
   └─╼ npm:ready     ╾─╼ ƒ(sendCommands)  ╾─╼ npm/*
```
