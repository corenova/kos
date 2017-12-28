# console reactor

This reactor provides reactions to user prompt interactions.

Source code is available [here](./console.js).

## Usage

```js
const ConsoleReactor = require('kos/reactor/console')
```

## kos --show console

```
console: reactions to user prompt interactions
├─ id: 36884def-92db-428b-a2c0-6b01487488e1
├─ passive: false
├─ enabled: true
├─ depends
│  ├─ module/readline
│  └─ module/treeify
├─ reactors
│  └─ render
├─ reactions
│  ├─ ƒ(promptUser)
│  └─ ƒ(renderReactor)
└──┐
   ├─ render: reactions to visually render reactors
   │  ├─ id: 651dcba4-c880-4c47-92d9-a5f3e0f6d7b3
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  └─ module/treeify
   │  ├─ reactions
   │  │  ├─ ƒ(render)
   │  │  ├─ ƒ(renderReactorAsTree)
   │  │  └─ ƒ(outputReactorTree)
   │  └──┐
   │     ├─╼ render         ╾─╼ ƒ(render)              ╾┬╼ render/reactor
   │     │                                              └╼ render/output
   │     ├┬╼ module/treeify ╾┬╼ ƒ(renderReactorAsTree) ╾─╼ reactor/tree
   │     │└╼ render/reactor ╾┘
   │     └┬╼ reactor/tree   ╾┬╼ ƒ(outputReactorTree)
   │      └╼ render/output  ╾┘
   │
   │┌╼ process         ╾┐                    ┌╼ prompt
   ├┼╼ module/readline ╾┼╼ ƒ(promptUser)    ╾┴╼ render
   │└╼ stdio           ╾┘
   │┌╼ process         ╾┐
   └┼╼ show            ╾┼╼ ƒ(renderReactor) ╾─╼ render
    └╼ reactor         ╾┘
```
