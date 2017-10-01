# kos-reactors-http

This reactor module provides message based transaction using HTTP as a
client and/or server.

Source code is available [here](./http.js).

## Usage

```js
//file name: httpTest.js

//This example is to use the http reactor and to handle the
//responses using the kos

//To execute this sample, you can run kos command prompt.
//"kos httpTest"

//Once the app is started you can call the command 
//"http/request/get "google.com""
//in the kos prompt to initiate the reaction event.

const { kos = require('..') } = global
const http = require('../reactors/http');

module.exports = kos.create('mytest')
	.load(http)
	.in('http/response').out('processImgs').bind(processResponse)
	.in('processImgs').bind(processImages);

function processImages(response) {	
	//your code goes here to process the images
}

function processResponse(response) {
	console.log('Response received');
	this.send("processImgs", response);
}

```

## kos show

```

The command "kos show http" should be able to give the event hierarchy in the command line for your reference.

```
