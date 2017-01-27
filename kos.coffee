'use strict';

co = require('co')
url = require('url')
mqtt = require('mqtt') # should make this an optional dependency
stream = require('stream')
through2 = require('through2')

# expose KineticObjectStream
module.exports = kos['default'] = kos.kos = kos = KineticObjectStream

module.exports.Object = KineticObject
module.exports.Action = KineticAction

pushUnique = (items...) ->
  for item in items when item not in this
    this.push item; item

class KineticObjectStream extends stream.Duplex

  constructor: (origin, opts={}) ->
    # allow usage w/o the new operator
    unless this instanceof KineticObjectStream
      return new KineticObjectStream arguments...

    opts.readableObjectMode = true
    opts.writableObjectMode = true
    
    super opts
    
    @comsumes = []
    @provides = []
    @ignores = [] # explicitly disabled key(s)
    @actions = []

    self = this
    
    # the core essence of KOS 
    core = through2.obj (chunk, enc, callback) ->
      unless chunk instanceof KineticObject
        return callback new Error "chunk is not a KineticObject"
      return callback() if chunk.key in self.ignores
      
      core.push chunk if chunk.key in self.provides
      actions = self.actions[chunk.key]
      # TODO: should call this parallel
      kf.exec chunk for kf in actions ? []
      callback()
    this.pipe(core).pipe(this)
    
    @queue = []
    @link = new Promise (resolve, reject) ->
      # url.parse(origin)
      #
      # TODO: should make mqtt optional
      # TODO: try to get access to mqtt stream directly?
      mq = mqtt.connect(origin)
      mq.on 'connect', -> resolve(mq); self.emit 'connect', self
      mq.on 'error', reject
      mq.on 'message', (topic, message, packet) ->
        self.queue.push new KineticObject topic, message

  # subscribe to upstream link for topic/key(s)
  consume: (keys...) ->
    co ->
      link = yield @link
      keys = pushUnique.apply @consumes, keys.filter(String)
      link.subscribe(key) for key in keys
    return this

  # publish to upstream link for topic/key(s)
  provide: (keys...) ->
    pushUnique.apply @provides, keys.filter(String)
    return this

  # Primary entry point to define a new KineticAction within KOS
  # 
  # returns a KineticAction
  in: (inputs...) ->
    action = (new KineticAction inputs).join(this)
    @insert action
    return action

  bind: (action) ->
    pushUnique.call @actions, action
    return this

  # Convenience function for expressing singular input/output transform
  # 
  # i.e. io('hello','world').bind(fn)
  io: (input, output) ->
    unless arguments.length is 2
      throw new Error "[io] must supply exactly two arguments (input, output)"
    @in(input).out(output)

  # Convenience function for pushing KineticObject into Readable stream
  # 
  # Normally, this shouldn't be needed as the input objects should be
  # coming from the `link`. It's basically a way for an external
  # entity to interface with the internal dataflow state.
  # 
  # i.e. feed('hello',someObj)
  feed: (key, val) -> @push new KineticObject key, val

  #
  # Advanced Usage (typically used for troubleshooting)
  #

  # disable handling of specified topic/key(s)
  disable: (keys...) ->
    pushUnique.apply @ignores, keys.filter(String)
    return this

  # re-enable handling of previously disabled topic/key(s)
  enable: (keys...) ->
    @ignores.filter (el) -> keys.indexOf(el) < 0
    return this

  # custom implementation for Readable
  _read: ->
    while (@queue.length) {
      ko = @queue.shift()
      continue unless ko instanceof KineticObject
      @push ko
    }
    
  # custom implementation for Writable
  _write: (chunk, encoding, cb) ->
    unless chunk instanceof KineticObject
      cb new Error 'chunk must be KineticObject (should pipe into transform first)'
    else co ->
      link = yield @link
      link.publish(chunk.key, chunk.serialize())
      cb()


class KineticObject
  BSON = require('bson')
  bson = new BSON
  constructor: (key, value) ->
    # allow usage w/o the new operator
    unless this instanceof KineticObject
      return new KineticObject arguments...
    @ts = new Date
    @key = key
    @value = value
  
  serialize: -> bson.serialize(@value)

class KineticAction
  constructor: (inputs=[], outputs=[], action) ->
    # allow usage w/o the new operator
    unless this instanceof KineticAction
      return new KineticAction arguments...

    @state = {}
    @in inputs...
    @out outputs...
    @bind action if action?

  in: (inputs...) ->
    pushUnique.apply @inputs, inputs.filter(String)
    return this
    
  out: (outputs...) ->
    pushUnique.apply @outputs, outputs.filter(String)
    return this

  bind: (fn) ->
    unless typeof fn is 'function'
      throw new Error "[KineticAction:bind] must supply a function"
    unless @inputs.length > 0
      throw new Error "[KineticAction:bind] rule does not contain any inputs"
      
    # TODO: do we need this?
    if fn.kinetic? 
      throw new Error "[KineticAction:bind] attempting to re-bind a Kinetic fuction"

    @action = fn
    return @kos ? this # make it chainable if already joined to KOS

  exec: (ko) ->
    unless ko instanceof KineticObject
      throw new Error "[KineticAction:exec] cannot execute without KineticObject"
    @set ko.key, ko.value
    @action.apply this, ko.key, ko.value

  outflow: (kos) ->
    unless kos instanceof KineticObjectStream
      throw new Error "[KineticAction:join] cannot join an invalid KOS"
    if @kos? and kos isnt @kos
      throw new Error "[KineticAction:join] cannot join more than one KOS at a time"
    @kos = kos
    return this

  # Methods primarily used inside the bound function

  set: (key, value) -> @state[key] = value; return this # chainable
    
  get: (keys...) -> switch
    when keys.filter(String).length > 1  then (@state[k] for k in keys)
    when keys.filter(string).length is 1 then @state[keys[0]]
    
  has: (keys...) -> keys.every (k) => typeof k is 'string' and @state[k]?
  
  push: (key, value, force=false) ->
    unless force or key in @outputs
      throw new Error "[KineticAction:join] cannot push '#{key}' not in outputs: [#{@outputs}] (try force=true if this is desired)"
    @kos.feed key, value
    return this # chainable
    
