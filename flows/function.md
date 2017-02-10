# kos-flow-function

Source code is [here](./function.js).

## Usage

```js
const FunctionFlow = require('kos/flows/function')
// or
const kos = require('kos')
const FunctionFlow = kos.load('kos-flow-function')
```

## kos show

```
├─ label: kos-flow-function
├─ summary: Provides dynamic function exeuction via messages
├─ requires
│  └─ function
├─ actions
│  └─ ƒ(exec)
└──┐
   │┌╼ arguments ╾┐
   └┼╼ function  ╾┼╼ ƒ(exec) ╾─╼ return
    └╼ caller    ╾┘
```
