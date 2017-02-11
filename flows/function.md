# kos-flow-function

This simple flow is a basic unit that allows message based execution
of any arbitrary JS function. It's provided to serve as one of the
building blocks for enabling dynamic function execution. It isn't all
that useful in a stand-alone context but when used as a subflow by
other flows, it provides an opportunity for other flows to
**intercept** and dynamically *transform* arguments and as well as
return responses for more interesting behavior. You can refer to
[interlink](http://github.com/corenova/interlink) for how it is
leveraged for serverless infrastructure execution control.

Source code is available [here](./function.js).

## Usage

```js
const FunctionFlow = require('kos/flows/function')
// or
const kos = require('kos')
const FunctionFlow = kos.load('kos-flow-function')
FunctionFlow
  .on('return', x => console.log(x))
  .feed('function', x => x+1)
  .feed('caller', this)
  .feed('arguments', [ 100 ])
// should output '101' to console
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
