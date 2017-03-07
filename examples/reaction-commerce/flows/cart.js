
const kos = require('kos')

module.exports = kos.create('reaction-cart')
  .summary('Provides reaction commerce cart management workflow')
  .import('reaction-shop')

// flow reactors
  .in('reaction/shop').bind(collectShops)
  .in('reaction/item').out('reaction/cart').default('items', new Set).bind(addItemToCart)
  .in('reaction/cart').out('cart/items').bind(itemizeReactionCart)

//----------
// Reactors
//----------

function collectShops(shop) {
  this.post('reaction/shop/'+shop.id, shop)
}

function addItemToCart(item) {
  let items = this.get('items')
  items.add(item)
  this.send('reaction/cart', {
    items: Array.from(items)
  })
}

function itemizeReactionCart(cart={ items: [] }) {
  this.send('cart/items', cart.items.map(x => {
    let shop = this.fetch('reaction/shop/'+x.shopId)
    return {
      id: x.variants._id,
      price: x.variants.price,
      quantity: x.quantity,
      taxable: x.taxable,
      origin: shop.addressBook[0] // TODO should try to find which address has the item
    }
  }))
}

