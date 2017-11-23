# debug flow observer

The debug flow observer can be utilized to send debugging messages
generated by the reactions to an output stream (such as console).

Source code is [here](./debug.js)

## Usage

### Using with `kos`

The `kos` utility intrinsically utilizes the [engine](./engine.md)
flow observer which interally loads the [debug](./debug.md) flow
observer.

The `program` stimuli produces `debug/level` output according to the
object data and causes `debug` flow observer to take effect.

### Using as a module

```js
const DebugFlow = require('kos/flow/debug')
```

It depends on `module/debug` (a Node.js
[debug package](https://npmjs.com/package/debug)) which can be fed
into the observer as follows:

```js
debug.feed('module/debug', require('debug'))
```

## kos --show

```
debug: reactions to send debugging messages to an output stream
├─ requires
│  ├─ debug/level
│  └─ module/debug
├─ reactions
│  ├─ ƒ(setupLogger)
│  ├─ ƒ(outputError)
│  └─ ƒ(outputMessage)
└──┐
   ├┬╼ module/debug ╾┬╼ ƒ(setupLogger)
   │└╼ debug/level  ╾┘
   ├┬╼ debug/level  ╾┬╼ ƒ(outputError)
   │└╼ error        ╾┘
   ├─╼ warn         ╾─╼ ƒ(outputMessage)
   ├─╼ info         ╾─╼ ƒ(outputMessage)
   └─╼ debug        ╾─╼ ƒ(outputMessage)
```