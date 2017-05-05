'use strict'

const { kos = require('kos') } = global

module.exports = kos.create('reaction-shipping')
  .desc('reactions to Reaction commerce shipping workflow')
  // flow reactors
  .in('cart/items','reaction/shipping').out('cart/items/shippable').bind(itemizeShippableGoods)
  .in('reaction/shipping').out('reaction/shipping/address').bind(extractShippingAddress)

//-------------------
// Reactor Functions
//-------------------

function itemizeShippableGoods(items, shipping) {
  let shippables = []
  let destination = shipping.address
  this.send('cart/items/shippable', items.map(x => {
    return Object.assign({}, x, {
      destination: destination
    })
  }))
}
  
function extractShippingAddress(shipping) {
  this.send('reaction/shipping/address', shipping.address)
}
