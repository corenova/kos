'use strict';

const debug = require('debug')('kos:channel');

const { Duplex } = require('stream')
const Pulse = require('./pulse')

const kSource = Symbol.for('kos:source')
const kParent = Symbol.for('kos:parent')
const kBuffer = Symbol.for('kos:buffer')
const kHandle = Symbol.for('kos:handle')
const kProp = Symbol.for('property')

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
    
    //debug(chunk.toString())
    buffer += chunk
    let lines = buffer.split(/\r?\n/)
    buffer = lines.pop()
    let pushed = false
    let line
    while ((line = lines.shift()) !== undefined) {
      try {
        //debug(`${parent} [remote] --> received ${line.length} bytes`)
        let pulse = Pulse.parse.call(parent, line.trim())
        debug(`${parent} [remote] --> ${pulse.topic}`)
        debug(line)
        if (!this.push(pulse.tag(this))) {
          buffer = lines.join("\n") + buffer
          this[kSource].pause() // tell source to stop flowing data
          break;
        }
        pushed = true
      } catch (e) {
        debug(`${parent} [remote] --> ${e.message}`)
        //parent.error(e)
      }
    }
    this[kBuffer] = buffer
    return pushed
  }

  // Pulse -> String
  _write(pulse, encoding, callback) {
    const parent = this[kParent]
    const filterList = (list) => {
      const prop = list[kProp]
      if (!prop) return list
      return Array.from(prop.changes).map(i => i.content)
    }
    if (pulse instanceof Pulse) {
      let pass = (!pulse.tagged(this) && !pulse.tagged(parent) && pulse.node)
      if (pass && (pulse.kind === 'action' || pulse.kind === 'rpc'))
        pass = pulse.pending
      if (pass) {
        let data = null
        if (pulse.node && pulse.kind === 'list') {
          data = pulse.toString(filterList)
        } else {
          data = pulse.toString()
        }
        debug(`${parent} [remote] <-- ${pulse.topic}`)
        debug(data)
        this[kSource].write(data, callback) 
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
