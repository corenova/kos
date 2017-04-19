# Developer's Guide

Welcome to [Dataflow Programming](https://en.wikipedia.org/wiki/Dataflow_programming).

## Creating a new Reactor

Let's make things a bit more **interesting** and say you now want to
find images from the requested URL.

But instead of adding to the original `HttpFlow`, let's start a new one.

```js
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

```js
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

```js
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

```js
WebFlow
  .on('picture/people',x => console.log('found picture!'))
  .feed('image/analysis/provider', someAnalysisInstance)
  .feed('http/request','http://www.google.com')
```

There you have it! You now have a web scraper that can find pictures
of people at arbitrary URLs. You can find a more complete version of
this in the [examples](./examples) folder of this repository.


As discussed in
[Managing Dependencies](./docs/usage.md#managing-dependencies) section
of the [Using Reactors](./docs/usage.md) guide, properly created KOS
modules do NOT contain any *explicit* external module dependencies at
the module-level but instead receive them via the stream from the
upstream consumer. As such, maintaining `package.json` or publishing
the KOS modules to NPM is completely optional.

