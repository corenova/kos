# log reactor

The log reactor can be utilized to send debugging messages generated
by the reactions to an output stream (such as console).

Source code is [here](./log.js)

## Usage

### Using with `kos`

The `kos` utility intrinsically utilizes the [node](./node.md) Reactor
which interally loads the [log](./log.md) reactor.

The `program` stimuli produces `log` output according to the
command-line arguments and causes `log` reactor to take effect.

### Using as a module

```js
const LogReactor = require('kos/reactor/log')
```

It depends on `module/debug` (a Node.js
[debug package](https://npmjs.com/package/debug)) which can be fed
into the observer as follows:

```js
LogReactor.feed('module/debug', require('debug'))
```

## kos --show

```
log: reactions to send logging messages to an output stream
├─ id: c2b94e85-3de0-4189-a439-5e6e66013094
├─ passive: false
├─ enabled: true
├─ depends
│  └─ module/debug
├─ reactions
│  ├─ ƒ(setup)
│  ├─ ƒ(savePrompt)
│  └─ ƒ(outputError)
└──┐
   ├┬╼ module/debug ╾┬╼ ƒ(setup)
   │└╼ log          ╾┘
   ├─╼ prompt       ╾─╼ ƒ(savePrompt)
   └┬╼ log          ╾┬╼ ƒ(outputError)
    └╼ error        ╾┘
```
