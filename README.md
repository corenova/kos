# Kinetic Object Stream

Simple, unopionated*, dataflow transform streaming framework that
makes your apps more interesting.

## DataFlow Pipelines

kos1.pipe(kos2)
kos1 -> read -> _read -> [buffer] -> kos2 -> write -> _write -> [source]

kos.Action((hi) => {

}).in('foo','bar').out('foo+bar')


Simply **consume** the objects you need and **provide** the objects
you have to the world around you. 


```javascript
import Kos, {pull, push} from 'kos'

// supports YANG data model schema
Kos.use('module hello { leaf world { type string; } }')

// this example simply talks to itself...
pull('hello:world').on('data', (msg, from) => console.log(`got: ${msg} from: #{from}`) );
push('hello:world').write('success!');

```

Obviously, it gets *far more interesting* when you do this across
multiple instances running on different nodes. Refer to
[Distributed KOS](#distributed-kos) section for more
details.

Nevertheless, embracing `Kos` within the same application also has
useful value (i.e. serving as internally consistent schema-validated
*store* for [React](http://facebook.github.io/react) web apps).

## Installation

```bash
$ npm install kos
```

For development/testing, clone from the repo and initialize:

```bash
$ git clone https://github.com/corenova/kos
$ cd kos
$ npm install
```

## Distributed KOS



### Simple Client-to-Server (one-one) Example

Here we consider a simple two-tier web application architecture with a
communication between a web browser client and a web application
server.

#### Client-side Source

```javascript
import Kos, {pull, push} from 'kos'
import OAuthSchema from 'kos-oauth.yang'

var Store = Kos.createStore()

const HelloWorldSchema = (`
  module hello-world {
    prefix hello;
	container world {
	  leaf message { type string; }
    }
  }
`)

Kos.use(OAuthSchema, HelloWorldSchema)

push("oauth:identity").write({
  user: 'test',
  pass: 'dummy'
}).pipe(Store)

pull("hello:world").pipe(Store)

```

### Server-side Source
```

```

The underlying fabric will continuously trace the path of objects in
motion and adapt accordingly to attain optimal equilibrium based on a
set of primitive laws of physics.

Every time a `pull/push` operation takes place, the logical distance
between the transacting nodes is adjusted based on the computed pull
vs. push force calculation. Over time, the participating nodes will
self-organize into logical clusters to optimize the relationship
between objects.

### Discovering Objects

The fabric brokers relationships based on the *data model schema* of
the underlying object(s) in question. When a new node joins the KOS
fabric, it makes `pull` request(s) containing the *data model schema*
of the objects it wants. It also makes `push` request(s) containing
the *data model schema* of the objects it provides. An established
`pull` request opens a new **readable** stream while an established
`push` request opens a new **writable** stream.

Successful transmit/receive of objects are achieved when there is an
overlap of the propagation domain between the two participating nodes.

### Establishing Trust

The trust relationship between communicating nodes is established
utilizing the same `pull/push` negotiation. Each party makes *pull*
request(s) with the *data model schema* of the object for
authentication/authorization it wants from each other.

### Pulling Objects

The strength of your `pull` increases as you accumulate more
objects. It is magnified between nodes that share more similar
objects. Stronger the `pull`, the receiver can fetch objects from
greater distances, which can span multiple hops across nearby
nodes. When you get too heavy and cannot store any more objects
(i.e. out of storage) you may *decide* to [explode](#Exploding Node)
and become a *nebula* (cluster of stars). If you explicitly choose
*not* to [explode](#Exploding Node) but instead adapt to the
accumulation by destroying existing objects, you then become a *black
hole*. A *black hole* node serves as a garbage collector within the
KOS fabric and is a useful construct to constrain increasing entropy.

### Pushing Objects

The strength of your `push` increases as you provide more objects to
interested nodes. It is magnified between nodes that share less
similar objects. Stronger the `push`, the transmitter can send
objects across greater distances, which can span multiple hops across
nearby nodes. If the object you `push` does not have any interested
consumers, it may never traverse beyond the transmitting node.
