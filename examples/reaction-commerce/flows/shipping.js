'use strict'

const kos = require('kos')

module.exports = kos.create('reaction-shipping')
  .in('cart/items','reaction/shipping').out('cart/items/shippable').bind(itemizeShippableGoods)

//----------
// Reactors
//----------

function itemizeShippableGoods(items, shipping) {
  let shippables = []
  let destination = shipping.address
  this.send('cart/items/shippable', items.map(x => {
    return Object.assign({}, x, {
      destination: destination
    })
  }))
}
  
