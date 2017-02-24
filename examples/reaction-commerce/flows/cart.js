
const kos = require('kos')

module.exports = kos.create('reaction-cart')
  .summary('Provides reaction commerce cart management workflow')
  .import('reaction-shop')

// flow triggers
  .on('add').pull('reaction-shop').bind(addItemToCart)
  .on('remove').bind(removeItemFromCart)
  .on('update').bind(updateItemInCart)

// flow reactors
  .in('reaction/shop').bind(collectShops)
  .in('reaction/item').out('reaction/cart').bind(addItemToCart)
  .in('reaction/cart').out('cart/items').bind(itemizeReactionCart)

//----------
// Reactors
//----------

function collectShops(shop) {
  this.post('reaction/shop/'+shop.id, shop)
}

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

