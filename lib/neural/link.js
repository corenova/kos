'use strict';

const debug = require('debug')('kos:link')
const isStream = require('is-stream')
//const { Transform } = require('stream')

class Link {
  constructor(from, to) {
    if (!isStream(from) || !isStream(to))
      throw new Error("can only create a Link between streams")
    this.from = from
    this.to = to
  }
}

class Push extends Link {
  constructor(from, to) {
    super(from, to)
    from.pipe(to)
  }
}

class Pull extends Link {
  constructor(from, to) {
    super(from, to)
    to.pipe(from)
  }
}

class Sync extends Link {
  constructor(from, to) {
    super(a, b)
    this.push = Link(from, to)

    Link(from, to), Link(to, from)

    from.pipe(to).pipe(from)
  }
}
