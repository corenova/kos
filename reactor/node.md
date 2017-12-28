# node reactor

The `node` reactor provides reactions to Node.js runtime context, such
as `process` and `program`.

It's used with the `kos` CLI utility [kos](./bin/kos.js) to provide
runtime execution control such as loading additional Reactors and
interactive command prompt.

Source code is [here](./node.js)

## Usage

```js
const NodeReactor = require('kos/reactor/node')
```
## kos --show node

```
node: reactions to Node.js runtime context
├─ id: 252ccdfc-b53f-4f45-ba66-34e3bd14700d
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/fs
│  ├─ module/path
│  ├─ module/readline
│  └─ module/treeify
├─ reactors
│  └─ console
├─ reactions
│  ├─ ƒ(initialize)
│  ├─ ƒ(start)
│  ├─ ƒ(saveSearchPath)
│  ├─ ƒ(loadReactor)
│  ├─ ƒ(resolveDependency)
│  ├─ ƒ(tryRequire)
│  └─ ƒ(readKSONFile)
└──┐
   ├─ console: reactions to user prompt interactions
   │  ├─ id: 98ee4dae-7415-4160-b519-c0611a71960a
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  ├─ module/readline
   │  │  └─ module/treeify
   │  ├─ reactors
   │  │  └─ render
   │  ├─ reactions
   │  │  ├─ ƒ(promptUser)
   │  │  └─ ƒ(renderReactor)
   │  └──┐
   │     ├─ render: reactions to visually render reactors
   │     │  ├─ id: f0e69eb1-8e77-4fbc-94d0-74dba0fba409
   │     │  ├─ passive: false
   │     │  ├─ enabled: true
   │     │  ├─ depends
   │     │  │  └─ module/treeify
   │     │  ├─ reactions
   │     │  │  ├─ ƒ(render)
   │     │  │  ├─ ƒ(renderReactorAsTree)
   │     │  │  └─ ƒ(outputReactorTree)
   │     │  └──┐
   │     │     ├─╼ render         ╾─╼ ƒ(render)              ╾┬╼ render/reactor
   │     │     │                                              └╼ render/output
   │     │     ├┬╼ module/treeify ╾┬╼ ƒ(renderReactorAsTree) ╾─╼ reactor/tree
   │     │     │└╼ render/reactor ╾┘
   │     │     └┬╼ reactor/tree   ╾┬╼ ƒ(outputReactorTree)
   │     │      └╼ render/output  ╾┘
   │     │
   │     │┌╼ process         ╾┐                    ┌╼ prompt
   │     ├┼╼ module/readline ╾┼╼ ƒ(promptUser)    ╾┴╼ render
   │     │└╼ stdio           ╾┘
   │     │┌╼ process         ╾┐
   │     └┼╼ show            ╾┼╼ ƒ(renderReactor) ╾─╼ render
   │      └╼ reactor         ╾┘
   │
   ├─╼ process         ╾─╼ ƒ(initialize)        ╾─╼ resolve
   │                                             ┌╼ load
   │┌╼ program         ╾┐                        ├╼ read
   ├┴╼ process         ╾┴╼ ƒ(start)             ╾┼╼ show
   │                                             ├╼ log
   │                                             └╼ stdio
   ├─╼ path            ╾─╼ ƒ(saveSearchPath)
   ├┬╼ module/path     ╾┬╼ ƒ(loadReactor)       ╾┬╼ reactor
   │└╼ load            ╾┘                        └╼ resolve
   ├─╼ resolve         ╾─╼ ƒ(resolveDependency) ╾─╼ require
   ├─╼ require         ╾─╼ ƒ(tryRequire)        ╾─╼ module/*
   └┬╼ module/fs       ╾┬╼ ƒ(readKSONFile)
    └╼ read            ╾┘
```
