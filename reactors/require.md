# require

This flow module provides a useful pattern for fulfilling `module/xxx`
dependencies for other flows. It can be *embedded* or used as a *data
pipeline* to other flows that have `module/xxx` related dependencies.

You can also make this flow become NPM-aware and attempt automatic
fetch/install utilizing NPM if the local `require` fails to find the
requested module. It includes the [kos-flow-npm](./npm.md) module as a
subflow to this module although it will remain *inactive* until it
receives a `require/npm` trigger message.

Source code is [here](./require.js).

## Usage

```js
const require = require('kos/reactors/require')
```

Simple example:
```js
requireReactor
  .on('module/url', x => console.log(x))
  .feed('require/url')
```

Enabling it to `require` external modules not found in the local
system:
```js
requireReactor
  .on('module/delegates', x => console.log(x))
  .feed('require/npm')
  .feed('require/delegates')
```

## kos show

```
├─ name: require
├─ purpose: Provides external module loading via 'require'
├─ subflows
│  └─ kos-flow-npm
├─ actions
│  ├─ ƒ(tryRequire)
│  ├─ ƒ(normalize)
│  ├─ ƒ(autoFetchMissing)
│  └─ ƒ(handleAutoFetch)
└──┐
   ├─ kos-flow-npm
   │  ├─ summary: Provides NPM registry transactions utilizing 'npm' module
   │  ├─ requires
   │  │  └─ module/npm
   │  ├─ actions
   │  │  ├─ ƒ(triggerLoad)
   │  │  ├─ ƒ(initialize)
   │  │  ├─ ƒ(install)
   │  │  ├─ ƒ(installByName)
   │  │  ├─ ƒ(queueCommands)
   │  │  └─ ƒ(sendCommands)
   │  └──┐
   │     ├─╼ module/npm    ╾─╼ ƒ(triggerLoad)   ╾─╼ npm/load
   │     ├─╼ npm/load      ╾─╼ ƒ(initialize)    ╾─╼ npm:ready
   │     ├┬╼ npm/install   ╾┬╼ ƒ(install)       ╾─╼ npm/installed
   │     │└╼ npm:ready     ╾┘
   │     ├─╼ npm/install/* ╾─╼ ƒ(installByName) ╾─╼ npm/install
   │     ├─╼ npm/*         ╾─╼ ƒ(queueCommands) ╾
   │     └─╼ npm:ready     ╾─╼ ƒ(sendCommands)  ╾─╼ npm/*
   │
   ├─╼ require       ╾─╼ ƒ(tryRequire)       ╾─╼ module/*
   ├─╼ require/*     ╾─╼ ƒ(normalize)        ╾─╼ require
   ├─╼ error         ╾─╼ ƒ(autoFetchMissing) ╾─╼ npm/install
   └┬╼ require       ╾┬╼ ƒ(handleAutoFetch)  ╾─╼ require
    └╼ npm/installed ╾┘
```
