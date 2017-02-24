// Reaction Cart Checkout Flow
'use strict'

const kos = require('kos')

module.exports = kos.create('reaction-checkout')
  .summary('Provides reaction commerce checkout workflow')
  .import('reaction-cart')
  .import('reaction-discount')
  .import('reaction-shipping')
  .import('reaction-tax')

// flow triggers
  .on('discount')
  .pull('reaction-cart')
  .push('reaction-discount')
  .bind(applyDiscountToCart)

  .on('shipping')
  .pull('reaction-cart')
  .push('reaction-shipping')
  .bind(applyShippingToCart)

  .on('calculate')
  .pull('reaction-cart')
  .pull('reaction-discount')
  .pull('reaction-shipping')
  .sync('reaction-tax')
  .bind(calculateCartTotal)

// flow reactors
  .in('cart/items').out('cart/subtotal').bind(calculateSubTotal)
  .in('cart/subtotal','cart/taxes').out('cart/total','cart/taxrate').bind(calculateTotal)

function calculateSubTotal(items) {
  let subTotal = items.reduce(((total, item) => {
    total += item.price * item.quantity
  }), 0)
  this.send('cart/subtotal', subTotal)
}  

function calculateTotal(sub, taxes) {
  let totalTax = taxes.reduce(((a,b) => a += b), 0)
  this.send('cart/total', sub + totalTax)
  this.send('cart/taxrate', totalTax / sub)
}
