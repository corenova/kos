# node persona

The `node` persona provides reactions to Node.js runtime context, such
as `process` and `program`.

It's used with the `kos` CLI utility [kos](./bin/kos.js) to provide
runtime execution control such as loading additional Personas and
interactive command prompt.

Source code is [here](./node.js)

## Usage

```js
const NodePersona = require('kos/persona/node')
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
├─ personas
│  └─ console
├─ reactions
│  ├─ ƒ(initialize)
│  ├─ ƒ(start)
│  ├─ ƒ(saveSearchPath)
│  ├─ ƒ(loadPersona)
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
   │  ├─ personas
   │  │  └─ render
   │  ├─ reactions
   │  │  ├─ ƒ(promptUser)
   │  │  └─ ƒ(renderPersona)
   │  └──┐
   │     ├─ render: reactions to visually render personas
   │     │  ├─ id: f0e69eb1-8e77-4fbc-94d0-74dba0fba409
   │     │  ├─ passive: false
   │     │  ├─ enabled: true
   │     │  ├─ depends
   │     │  │  └─ module/treeify
   │     │  ├─ reactions
   │     │  │  ├─ ƒ(render)
   │     │  │  ├─ ƒ(renderPersonaAsTree)
   │     │  │  └─ ƒ(outputPersonaTree)
   │     │  └──┐
   │     │     ├─╼ render         ╾─╼ ƒ(render)              ╾┬╼ render/persona
   │     │     │                                              └╼ render/output
   │     │     ├┬╼ module/treeify ╾┬╼ ƒ(renderPersonaAsTree) ╾─╼ persona/tree
   │     │     │└╼ render/persona ╾┘
   │     │     └┬╼ persona/tree   ╾┬╼ ƒ(outputPersonaTree)
   │     │      └╼ render/output  ╾┘
   │     │
   │     │┌╼ process         ╾┐                    ┌╼ prompt
   │     ├┼╼ module/readline ╾┼╼ ƒ(promptUser)    ╾┴╼ render
   │     │└╼ stdio           ╾┘
   │     │┌╼ process         ╾┐
   │     └┼╼ show            ╾┼╼ ƒ(renderPersona) ╾─╼ render
   │      └╼ persona         ╾┘
   │
   ├─╼ process         ╾─╼ ƒ(initialize)        ╾─╼ resolve
   │                                             ┌╼ load
   │┌╼ program         ╾┐                        ├╼ read
   ├┴╼ process         ╾┴╼ ƒ(start)             ╾┼╼ show
   │                                             ├╼ log
   │                                             └╼ stdio
   ├─╼ path            ╾─╼ ƒ(saveSearchPath)
   ├┬╼ module/path     ╾┬╼ ƒ(loadPersona)       ╾┬╼ persona
   │└╼ load            ╾┘                        └╼ resolve
   ├─╼ resolve         ╾─╼ ƒ(resolveDependency) ╾─╼ require
   ├─╼ require         ╾─╼ ƒ(tryRequire)        ╾─╼ module/*
   └┬╼ module/fs       ╾┬╼ ƒ(readKSONFile)
    └╼ read            ╾┘
```
