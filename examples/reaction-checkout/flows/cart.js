
const kos = require('kos')

module.exports = kos.flow
  .label('reaction-cart')
  .use(ReactionTaxFlow)
  .in('product').out('cart').bind(addProductToCart)
  

[ checkout workflow ]
should be per customer + cart instance

requires customer, cart
input shipping
input discount
input billing

subflow taxes
subflow currency

output cart (updated)

preconditions:
each customer has one unique cart instance
cart must contain at least one item
each item can be from a different shop
each item denotes whether it is taxable
each shop has its own address (used as origin)

may require same billing/shipping address?

