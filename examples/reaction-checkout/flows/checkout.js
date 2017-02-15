// Reaction Cart Checkout Flow

const kos = require('kos')

module.exports = kos.flow
  .label('reaction-checkout')
  .use('reaction-tax')

  // temporary for testing only
  .in('reaction/shop').bind(function collectShops(shop) {
    this.push('reaction/shop/'+shop.id, shop)
  })

  .in('reaction/cart','reaction/shipping').out('reaction/cart/items/shippable')
  .bind(itemizeShippableGoods)

  .in('reaction/cart/items/shippable').out('reaction/cart/items/taxable')
  .bind(filterTaxableGoods)

  .in('reaction/cart/tax/total').require('reaction/cart')
  .out('reaction/cart', 'reaction/cart/tax/rate')
  .bind(updateCartWithTax)

function itemizeShippableGoods(cart, shipping) {
  let shippables = []
  for (const item of cart.items) {
    let shop = this.pull('reaction/shop/'+item.shopId)
    let entry = Object.assign({}, item, {
      origin: shop.addressBook[0], // TODO should try to find which address has the item
      destination: shipping.address
    })
    shippables.push(entry)
  }
  this.send('reaction/cart/items/shippable', shippables)
}
  
function filterTaxableGoods(shippables) {
  let taxables = shippables.filter(x => x.taxable)
  this.send('reaction/cart/items/taxable', taxables)
}

  
