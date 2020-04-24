const debug = require('./debug').extend('channel');
const delegate = require('delegates');
const { Duplex } = require('stream');
const Pulse = require('./pulse');

const kSource = Symbol.for('kos:source')
const kParent = Symbol.for('kos:parent')
const kBuffer = Symbol.for('kos:buffer')
const kHandle = Symbol.for('kos:handle')
const kProp = Symbol.for('property')

class Channel extends Duplex {

  get [Symbol.toStringTag]() { return `Channel:${this.uri}`; }
  get type() { return Symbol.for('kos:channel'); }
  
  constructor(source) {
    super({ objectMode: true });
    this[kSource] = source;
    this[kBuffer] = ''
    const absorb = (chunk) => this.absorb(chunk);
    source.on('data', absorb);
    source.on('end', () => this.disconnect());
    // source.on('end', () => this.end());
    this.on('close', () => source.off('data', absorb));
  }
  connect(parent) {
    if (this[kParent] === parent) return this;
    this[kParent] = parent;
    parent.pipe(this);
    this.pipe(parent);
    return this;
  }
  disconnect() {
    const parent = this[kParent];
    if (parent) {
      parent.unpipe(this);
      this.unpipe(parent);
    }
    return this;
  }
  // convert Buffer/String -> Pulse
  absorb(chunk) {
    let buffer = this[kBuffer];
    
    buffer += chunk;
    let lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    let pushed = false;
    let line;
    while ((line = lines.shift()) !== undefined) {
      try {
        //debug(`${this.uri} [remote] --> received ${line.length} bytes`)
        let pulse = Pulse.parse.call(this, line.trim());
        debug(`${this.uri} [remote] --> ${pulse.topic}`);
        debug(`${this.uri} %O`, pulse.data);
        if (!this.push(pulse)) {
          buffer = lines.join("\n") + buffer;
          this[kSource].pause(); // tell source to stop flowing data
          break;
        }
        pushed = true;
      } catch (e) {
        this.error(e)
      }
    }
    this[kBuffer] = buffer;
    return pushed;
  }

  // Pulse -> String
  _write(pulse, encoding, callback) {
    const diff = (node) => (node && node[kProp]) ? node[kProp].change : node;
    if (pulse instanceof Pulse) {
      if (!pulse.tagged(this) && pulse.node) {
        let data = pulse.node ? pulse.toString(diff) : pulse.toString();
        debug(`${this.uri} [remote] <-- ${pulse.topic}`);
        debug(data);
        this[kSource].write(data, callback);
      } else {
        callback();
      }
    } else {
      callback(`${this.uri} [remote] requires a Pulse as input`);
    }
  }
  _read(size) { this[kSource].resume(); }
}

delegate(Channel.prototype, kParent)
  .getter('uri')
  .method('error')
  .method('locate')
  .method('lookup')

module.exports = Channel;
