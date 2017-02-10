# kos-flow-npm

Source code is [here](./npm.js).

## Usage

```js
const Npm = require('kos/flows/npm')
// or
const kos = require('kos')
const Npm = kos.load('kos/flows/npm')
```

## kos show

```
├─ label: kos-flow-npm
├─ summary: Provides NPM registry transactions utilizing 'npm' module
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
