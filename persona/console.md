# console persona

This persona provides reactions to user prompt interactions.

Source code is available [here](./console.js).

## Usage

```js
const ConsolePersona = require('kos/persona/console')
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
├─ personas
│  └─ render
├─ reactions
│  ├─ ƒ(promptUser)
│  └─ ƒ(renderPersona)
└──┐
   ├─ render: reactions to visually render personas
   │  ├─ id: 651dcba4-c880-4c47-92d9-a5f3e0f6d7b3
   │  ├─ passive: false
   │  ├─ enabled: true
   │  ├─ depends
   │  │  └─ module/treeify
   │  ├─ reactions
   │  │  ├─ ƒ(render)
   │  │  ├─ ƒ(renderPersonaAsTree)
   │  │  └─ ƒ(outputPersonaTree)
   │  └──┐
   │     ├─╼ render         ╾─╼ ƒ(render)              ╾┬╼ render/persona
   │     │                                              └╼ render/output
   │     ├┬╼ module/treeify ╾┬╼ ƒ(renderPersonaAsTree) ╾─╼ persona/tree
   │     │└╼ render/persona ╾┘
   │     └┬╼ persona/tree   ╾┬╼ ƒ(outputPersonaTree)
   │      └╼ render/output  ╾┘
   │
   │┌╼ process         ╾┐                    ┌╼ prompt
   ├┼╼ module/readline ╾┼╼ ƒ(promptUser)    ╾┴╼ render
   │└╼ stdio           ╾┘
   │┌╼ process         ╾┐
   └┼╼ show            ╾┼╼ ƒ(renderPersona) ╾─╼ render
    └╼ persona         ╾┘
```
