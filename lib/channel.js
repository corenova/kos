'use strict';

const debug = require('debug')('kos:channel');
const Pulse = require('./pulse')
const { Duplex } = require('stream')

const kSource = Symbol.for('kos:source')
const kParent = Symbol.for('kos:parent')
const kBuffer = Symbol.for('kos:buffer')
const kHandle = Symbol.for('kos:handle')

class Channel extends Duplex {

  constructor(source, parent) {
    super({ objectMode: true });
    this[kSource] = source;
    this[kParent] = parent;
    this[kBuffer] = ''
    const absorb = (chunk) => this.absorb(chunk)
    source.on('data', absorb)
    source.on('end', () => this.end())
    this.on('close', () => source.off('data', absorb))
  }
  // convert Buffer/String -> Pulse
  absorb(chunk) {
    let parent = this[kParent]
    let buffer = this[kBuffer]
    
    debug(chunk.toString())
    buffer += chunk
    let lines = buffer.split(/\r?\n/)
    buffer = lines.pop()
    let pushed = false
    let line
    while ((line = lines.shift()) !== undefined) {
      try {
        debug(`${parent} [remote] --> received ${line.length} bytes`)
        let pulse = Pulse.parse.call(parent, line.trim())
        debug(`${parent} [remote] --> ${pulse.topic}`)
        if (!this.push(pulse.tag(this))) {
          buffer = lines.join("\n") + buffer
          this[kSource].pause() // tell source to stop flowing data
          break;
        }
        pushed = true
      } catch (e) { parent.error(e) }
    }
    this[kBuffer] = buffer
    return pushed
  }

  // Pulse -> String
  _write(pulse, encoding, callback) {
    const parent = this[kParent]
    if (pulse instanceof Pulse) {
      if (!pulse.tagged(this)) {
        debug(`${parent} [remote] <-- ${pulse.topic}`)
        this[kSource].write(pulse.toString(), callback) 
      } else {
        callback()
      }
    } else {
      callback(`${parent} [remote] requires a Pulse as input`);
    }
  }
  _read(size) { this[kSource].resume() }
}

module.exports = Channel
