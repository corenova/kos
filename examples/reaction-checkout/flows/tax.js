// Reaction Tax Calculation Flow

const kos = require('kos')

module.exports = kos.flow
  .label('reaction-tax')
  .use('flow/taxcloud')
  .use('flow/avalara')

  // taxcloud request trigger
  .in('reaction/cart/items/taxable').require('flow/taxcloud','reaction/cart')
  .out('taxcloud/request')
  .bind(invokeTaxCloud)

  // avalara request trigger
  .in('reaction/cart/items/taxable').require('flow/avalara', 'reaction/cart')
  .out('avalara/request/address')
  .bind(invokeAvalara)

  // tax calculation from multiple possible triggers
  .in('taxcloud/response/items')
  .in('avalara/response')
  .require('reaction/cart/items/taxable','reaction/cart')
  .default('taxes', new Map)
  .out('reaction/tax/rate')
  .bind(calculateTaxes)

function invokeTaxCloud(items) {
  let cart = this.pull('reaction/cart')
  // we need to find common origin/destination pairs and issue one or more taxcloud/request(s)
  let origins = new Map
  for (const item of items) {
    let destinations = origins.get(item.origin)
    if (origins.has(item.origin)) {
      destinations = origins.get(item.origin)
      destinations.set(item.destination)
    } else {
      let destinations = new Map
      destinations.set(item.destination, item)
      origins.set(item.origin, destinations)
    }
  }

  items.map((x, idx) => ({
    Index: idx,
    ItemID: x.id,
    Price: x.price,
    Quantity: x.quantity
  }))
}

function invokeAvalara(items) {
  
}

// calculateTaxes - this routine gets called every time one of
// expected responses are received. we need to make a decision based
// on whichever tax calculation services send along sufficient
// response(s) in order to formulate the overall cart tax calculation.
function calculateTaxes(res) {
  let [ cart, items ] = this.get('reaction/cart', 'reaction/cart/items/taxable')
  let [ active, taxes ] = this.get('active', 'taxes')
  if (!active || active !== items) {
    if (taxes.size !== active.length) 
      this.throw('unable to calculate taxes for cart:', cart.id)
    this.set('active', items)
    this.set('taxes', taxes = new Map)
  }

  switch (this.key) {
  case 'taxcloud/response/items':
    let map = new Map
    res.forEach(x => map.set(x.id, x))
    
    break;
  case 'avalara/response':
    items
      .filter(x => x.destination === res.address)
      .forEach(x => taxes.set(x, res))
    break;
  }

  if (items.every(x => taxes.has(x))) {
    this.send('reaction/
  }
}
