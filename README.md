# Kinetic Object Stream

Simple, unopionated,
[dataflow](https://en.wikipedia.org/wiki/Dataflow) streaming framework
for creating **awesome data pipelines** for your apps.

It's a **data-centric** paradigm for moving *objects* through a pipeline of
computational actors that can execute concurrently.

Conduct [data science](https://en.wikipedia.org/wiki/Data_science)
experiments, share your flows, and embrace KOS.

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

```
├─ label: kos:flow:http
├─ summary: Provides HTTP transaction flow utilizing 'superagent' module
├─ requires
│  └─ module/superagent
└──┐
   │                                            ┌╼ http/request/get
   │                                            ├╼ http/request/post
   ├─╼ http/request         ╾─╼ ƒ(classify)    ╾┼╼ http/request/put
   │                                            ├╼ http/request/delete
   │                                            └╼ http/request/patch
   ├─╼ http/request/get     ╾─╼ ƒ(invoke)      ╾─╼ http/response
   ├─╼ http/request/get/url ╾─╼ ƒ(simpleGet)   ╾─╼ http/request/get
   ├─╼ http/request/post    ╾─╼ ƒ(invoke)      ╾─╼ http/response
   ├─╼ http/request/put     ╾─╼ ƒ(invoke)      ╾─╼ http/response
   ├─╼ http/request/delete  ╾─╼ ƒ(invoke)      ╾─╼ http/response
   ├─╼ http/request/patch   ╾─╼ ƒ(invoke)      ╾─╼ http/response
   └─╼ http/response        ╾─╼ ƒ(extractBody) ╾─╼ http/response/body
```

The above render was generated for [HTTP Flow](./flows/http) module
using the included `kos` CLI utility.

## Installation

```bash
$ npm install -g kos
```

## Definition

A **Kinetic Object Stream** contains a **Flow** of **Actions** that
operates on one or more *named input* **Object(s)** to produce one or
more *named output* **Object(s)**.

## Using Flows

First, let's start with a **trivial** scenario of making a web request
and getting back the result. We'll be utilizing one of the built-in
flow module ([HttpFlow](./flows/http)) for this exercise.

```javascript
const HttpFlow = require('./flows/http')
HttpFlow
  .on('http/response/body', data => console.log(data))
  .feed('module/superagent', require('superagent'))
  .feed('http/request/get/url', 'http://www.google.com')
```

The above example illustrates how you can interact with a **Flow**
created using the `kos` library. You `feed` the **Stream** with a
*named input* `http/request/get/url` and handle the resulting *named
output* `http/response/body`. Underneath the hood, a number of
**Action(s)** are triggered until you get back the *named data* of
interest.

### feed(key, value)

### on(key, callback)

## Creating Flows

Let's make things a bit more **interesting** and say you now want to
find images from the requested URL.

But instead of adding to the original `HttpFlow`, let's start a new one.

```javascript
const FindImagesFlow = kos.flow
  .in('http/response').out('http/response/html').bind(function() {
    // some code to detect the response is HTML
  })
  .in('http/response/html').out('html/image').bind(function() {
    let html = this.get('http/response/html')
	// ... some code to scan html and extract image tags
	let images = []
	for (let img of images) {
	  this.send('html/image',img)
    }
  })
// define the pipeline WebFlow -> FindImagesFlow
WebFlow.pipe(FindImagesFlow)

```

Now, when you `feed` the `http/request` into `WebFlow` the
`FindImagesFlow` will now get you all the image tags found.

Great, but what you really wanted was the actual images, right?

Let's make another flow for this:

```javascript
const FetchImageFlow = kos.flow
  .in('html/image').out('http/request').bind(function() {
    let imgtag = this.get('html/image')
	// ... some code should go here to grab src attribute
	this.send('http/request', 'url/to/image')
   })
// define the pipeline FindImagesFlow -> FetchImageFlow -> WebFlow
FindImagesFlow.pipe(FetchImageFlow).pipe(WebFlow)
```

Wait, isn't that a **circular loop** back into `WebFlow`?

Yep, that original *complicated* `WebFlow` block just became a lot
more useful and reusable. The `FetchImageFlow` will trigger for every
`html/image` tag found in a given `http/response/html` data chunk and
initiate a new `http/request` into the `WebFlow`.

While it's a very **powerful** construct to inherently support
*circular* pipelines, care must be taken to prevent *infinite*
loops. For example, if the subsequent `http/request` from
`FetchImageFlow` was made to yet another HTML page instead of to an
image, then the operation will continue to *loop forever* until no
further HTML page links were found (unless of course, that's exactly
what you wanted it to do).

To finish off this *trivial* example, let's grab images from `WebFlow`
and send it along to some cognitive analytics service to find out if
these are pictures of people.

```javascript
const AnalyzeImageFlow = kos.flow
  .in('http/response').out('http/response/image').bind(function() {
    let res = this.get('http/response')
	// ... some code to check mimetype of res
	let mimetype = 'image' 
	if (mimetype === 'image')
	  this.send('http/response/image', res)
  })
  .in('http/response/image').out('image/jpeg','image/png').bind(function() {
    // we only care about JPEG and PNG files
	// send either one based on what we find
  })
  .in('image*','image/analysis/provider').out('image/analysis/result').bind(function() {
    let [ img, service ] = this.get(...this.inputs)
	let res = service.analyze(img)
	this.send('image/analysis/result', res)
  })
  .in('image/analysis/result').out('picture/people').bind(function() {
    let analysis = this.get('image/analysis/result')
    // some code to detect if result was a picture
	if (analysis.type == 'picture' && analysis.hasPeople) {
  	  this.send('picture/people', analysis.source)
	}
  })
// define the pipeline WebFlow -> AnalyzeImageFlow
WebFlow.pipe(AnalyzeImageFlow)
```

Now, to put the dataflow to work:

```javascript
WebFlow
  .on('picture/people',x => console.log('found picture!'))
  .feed('image/analysis/provider', someAnalysisInstance)
  .feed('http/request','http://www.google.com')
```

There you have it! You now have a web scraper that can find pictures
of people at arbitrary URLs. You can find a more complete version of
this in the [examples](./examples) folder of this repository.

Welcome to [Dataflow Programming](https://en.wikipedia.org/wiki/Dataflow_programming).

## Multiple DataFlow Instances

For simple use cases, having just one instance of a KOS dataflow
pipeline may be sufficient.

However, if you need to have multiple instances within your
application to manage separate dataflow transactions or to wire up the
flows differently than originally defined, read on.

Continuing from the [Usage Example](#usage-example) above, let's say
you just want to re-use the `WebFlow` without the other flows being
associated.

```javascript
let myWebFlow = new WebFlow
```

You can also do `WebFlow()`, which is equivalent to `new
WebFlow`. This effectively creates a new instance of the KOS dataflow
without any of the pre-existing `pipe` relationships.

With your own instance of `WebFlow`, you can `inject` additional flow
rules, or `pipe` it to other flows:

```javascript
let myAnalyzeImageFlow = new AnalyzeImageFlow
myWebFlow
  .in('http/response').bind(function(key, value) {
    // do something
  })
  .pipe(AnalyzeImageFlow)
```

## State Management

TBD...


## License
  [Apache 2.0](LICENSE)

This software is brought to you by
[Corenova Technologies](http://www.corenova.com). We'd love to hear
your feedback.  Please feel free to reach me at <peter@corenova.com>
anytime with questions, suggestions, etc.

[npm-image]: https://img.shields.io/npm/v/kos.svg
[npm-url]: https://npmjs.org/package/kos
[downloads-image]: https://img.shields.io/npm/dt/kos.svg
[downloads-url]: https://npmjs.org/package/kos
