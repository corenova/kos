# npm persona

This persona provides basic NPM client transactions with the NPM
registry. It enables you to install/uninstall external modules to any
given endpoint running KOS. For example, it can be used in conjunction
with [node](./node.md) to auto-resolve dependencies via a simple
`require "some-module"` message.

Source code is [here](./npm.js).

## Usage

```js
const npm = require('kos/persona/npm')
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

## kos --show npm

```
npm: reactions to NPM package management requests
├─ id: 98cc3437-4bed-4899-8a8e-ca005f4e9526
├─ passive: false
├─ enabled: true
├─ depends
│  └─ module/npm
├─ reactions
│  ├─ ƒ(triggerLoad)
│  ├─ ƒ(initialize)
│  ├─ ƒ(queueInstall)
│  ├─ ƒ(install)
│  ├─ ƒ(autoFetchMissing)
│  └─ ƒ(handleAutoFetch)
└──┐
   ├─╼ module/npm    ╾─╼ ƒ(triggerLoad)      ╾─╼ npm/load
   ├┬╼ module/npm    ╾┬╼ ƒ(initialize)       ╾─╼ npm/loaded
   │└╼ npm/load      ╾┘
   ├┬╼ module/npm    ╾┬╼ ƒ(queueInstall)
   │└╼ npm/install   ╾┘
   │┌╼ module/npm    ╾┐
   ├┼╼ npm/install   ╾┼╼ ƒ(install)          ╾─╼ npm/installed
   │└╼ npm/loaded    ╾┘
   ├─╼ error         ╾─╼ ƒ(autoFetchMissing) ╾─╼ npm/install
   └─╼ npm/installed ╾─╼ ƒ(handleAutoFetch)  ╾─╼ require
```
