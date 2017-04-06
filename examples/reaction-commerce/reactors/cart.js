// Reaction Cart Management Flow
'use strict'

const { kos = require('kos') } = global

// XXX - just for demo purposes
const defaultShop = {
  addressBook: [
    {
      address1: '202 Bicknell Avenue',
      city: 'Santa Monica',
      region: 'CA',
      postal: 90405
    }
  ]
}

module.exports = kos.reactor('reaction-cart')
  .desc('Provides reaction commerce cart management workflow')
  .init('reaction/shop/default', defaultShop)

  // flow reactors
  .in('reaction/shop').bind(collectShops)
  .in('reaction/item').out('reaction/cart').init('items', new Map).bind(addItemToCart)
  .in('reaction/cart').out('cart/items').bind(itemizeReactionCart)

//-------------------
// Reactor Functions
//-------------------

function collectShops(shop) {
  this.post('reaction/shop/'+shop.id, shop)
}

function addItemToCart(item) {
  let items = this.get('items')
  items.set(item.id, item)
  this.send('reaction/cart', {
    items: Array.from(items.values())
  })
}

function itemizeReactionCart(cart={ items: [] }) {
  this.send('cart/items', cart.items.map(x => {
    let shopId = x.shopId || 'default'
    let shop = this.get('reaction/shop/' + shopId)
    return Object.assign({
      taxable: true,
      discountable: true
    }, x, {
      origin: shop.addressBook[0] // TODO should try to find which address has the item
    })
  }))
}

