/// <reference path="declarations.d.ts" />
import Yang = require('yang-js');
import Stream = require('stream');

class Pull extends Stream {
  constructor(query: string) {
	super()
  }
}

class Push extends Stream {
  constructor(query: string) {
	super()
  }
}

export class Kos extends Yang {
  static hello = "world";
  static pull(query: string): Stream {
	console.log(this.hello);
	return new Pull(query);
  }
  static push(query: string): Stream {
	return new Push(query);
  }
}

export const pull = Kos.pull
export const push = Kos.push

export default Kos;
