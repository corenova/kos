// Reaction Cart Checkout Flow
'use strict'

const { kos = require('kos') } = global

module.exports = kos.create('reaction-checkout')
  .summary('Provides reaction commerce checkout workflow')

// flow reactors
  .in('cart/items').out('cart/subtotal').bind(calculateSubTotal)
  .in('cart/subtotal','cart/taxes').out('cart/total','cart/taxrate').bind(calculateTotal)

function calculateSubTotal(items) {
  let subTotal = items.reduce(((total, item) => {
    total += item.price * item.quantity
    return total
  }), 0)
  this.send('cart/subtotal', subTotal)
}  

function calculateTotal(sub, taxes) {
  let totalTax = taxes.reduce(((a,b) => a += b), 0)
  this.send('cart/total', sub + totalTax)
  this.send('cart/taxrate', totalTax / sub)
}
