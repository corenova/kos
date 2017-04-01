'use strict'

const { kos = require('kos') } = global

module.exports = kos.reactor('reaction-discount')
  .desc('Provides reaction commerce discount management workflow')
  // flow reactors
  // KOS prevents looping of self-generated output from triggering itself
  .in('cart/items','reaction/discount').out('cart/items').bind(applyDiscount)

//-------------------
// Reactor Functions
//-------------------

function applyDiscount(items=[], discount={}) {
  let { rate = 0 } = discount
  this.send('cart/items', items.map(x => {
    if (!x.discountable) return x
    return Object.assign({}, x, {
      price: x.price * (100 - rate) / 100,
      discountable: false // TODO assume one-time discount per item
    })
  }))
}
