// Reaction Cart Checkout Flow
'use strict'

const { kos = require('kos') } = global

module.exports = kos.create('reaction-checkout')
  .desc('reactions to Reaction Commerce checkout workflow')

// flow reactors
  .in('cart/items').out('cart/subtotal').bind(calculateSubTotal)
  .in('cart/subtotal','cart/tax').out('cart/total','cart/taxrate').bind(calculateTotal)

function calculateSubTotal(items) {
  let subTotal = items.reduce(((total, item) => {
    total += item.price * item.quantity
    return total
  }), 0)
  this.send('cart/subtotal', subTotal)
}  

function calculateTotal(sub, tax) {
  this.send('cart/total', sub + tax)
  this.send('cart/taxrate', tax / sub)
}
