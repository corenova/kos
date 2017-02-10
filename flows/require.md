# kos-flow-require

Source code is [here](./require.js).

## Usage

```js
const Require = require('kos/flows/require')
// or
const kos = require('kos')
const Require = kos.load('kos/flows/require')
```

## kos show

```
├─ label: kos-flow-require
├─ summary: Provides external module loading via 'require'
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
