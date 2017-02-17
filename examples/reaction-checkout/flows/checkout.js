// Reaction Cart Checkout Flow

const kos = require('kos')

module.exports = kos.flow('reaction-checkout')
  .use('reaction-tax')
  .require('reaction/cart')

  // temporary for testing only
  .in('reaction/shop').bind(function collectShops(shop) {
    this.push('reaction/shop/'+shop.id, shop)
  })

  .in('reaction/cart').out('cart/items').bind(itemizeReactionCart)
  // KOS prevents looping of self-generated output from triggering itself
  .in('cart/items','reaction/discount').out('cart/items').bind(applyDiscount)
  .in('cart/items','reaction/shipping').out('cart/items/shippable').bind(itemizeShippableGoods)
  .in('cart/items/shippable').out('cart/items/taxable').bind(filterTaxableGoods)
  .in('cart/items').out('cart/subtotal').bind(calculateSubTotal)

  // cart/taxes comes from 'reaction-tax' subflow
  .in('cart/subtotal','cart/taxes').out('cart/total','cart/taxrate').bind(calculateTotal)

//--------------
// FLOW ACTIONS
//--------------

function itemizeReactionCart(cart) {
  this.send('cart/items', cart.items.map(x => {
    let shop = this.pull('reaction/shop/'+x.shopId)
    return {
      id: x.variants._id,
      price: x.variants.price,
      quantity: x.quantity,
      taxable: x.taxable,
      origin: shop.addressBook[0] // TODO should try to find which address has the item
    }
  }))
}

function applyDiscount(items, discount) {
  this.send('cart/items', items.map(x => {
    if (!x.discountable) return x
    return Object.assign({}, x, {
      price: x.price * (100 - discount.rate) / 100,
      discountable: false // TODO assume one-time discount per item
    })
  }))
}

function itemizeShippableGoods(items, shipping) {
  let shippables = []
  let destination = shipping.address
  this.send('cart/items/shippable', items.map(x => {
    return Object.assign({}, x, {
      destination: destination
    })
  }))
}
  
function filterTaxableGoods(shippables) {
  let taxables = shippables.filter(x => x.taxable)
  this.send('cart/items/taxable', taxables)
}

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
