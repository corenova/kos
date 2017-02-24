// Reaction Tax Calculation Stream

const kos = require('kos')

module.exports = kos.create('reaction-tax')

// flow triggers
  .flow('tax')
  .sync('taxation-avalara')
  .sync('taxation-taxcloud')
  .bind(calculateTax)

  .in('cart/items').out('cart/items/taxable').bind(filterTaxableGoods)


  // taxcloud request trigger
  .in('cart/items/taxable').out('taxcloud/request').bind(invokeTaxCloud)
  .in('taxcloud/response/items').out('taxcloud/taxes').bind(invokeTaxCloud)

  // avalara request trigger
  .in('cart/items/taxable').require('flow/avalara')
  .out('cart/items/tax')
  .bind(invokeAvalara)

  // tax calculation from multiple possible triggers
  .in('cart/items/taxable','taxcloud/taxes').out('cart/taxes').bind(calculateTaxes)
  .in('cart/items/taxable','avalara/taxes').out('cart/taxes').bind(calculateTaxes)


//--------------
// TRANSFORMS
//--------------

function filterTaxableGoods(shippables) {
  let taxables = shippables.filter(x => x.taxable)
  this.send('cart/items/taxable', taxables)
}

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
    Qty: x.quantity
  }))

  this.transact('taxcloud/request','taxcloud/response/items')
    .timeout(1000)
    .feed(...requests)
    .end((err, res) => {
      if (err) return this.throw(err)
      

    })
}

function invokeAvalara(items) {
  let addrs = new Set(items.map(x => x.destination))
  let addresses = Array.from(addrs)

  this.transact('avalara/request/address','avalara/response')
    .timeout(1000)
    .feed(...addresses) // multiple parallel requests
    .end((err, res) => {
      if (err) return this.throw(err)
      let map = new Map
      res.forEach((x, idx) => map.set(addresses[idx], x))
      this.send('cart/items/tax', items.map(x => {
        let taxRate = map.get(x.destination).totalRate
        let cost = x.price * x.quantity
        let tax = cost * (taxRate / 100)
        return Object.assign({}, x, {
          tax: {
            rate: taxRate,
            amount: tax
          }
        })
      }))
    })

  for (let address of addresses)
    this.send('avalara/request/address', address)
}

// calculateTaxes - this routine gets called every time one of
// expected responses are received. we need to make a decision based
// on whichever tax calculation services send along sufficient
// response(s) in order to formulate the overall cart tax calculation.
function calculateTaxes(res) {
  let items = this.get('cart/items/taxable')
  let [ active, taxes ] = this.get('active', 'taxes')
  if (!active || active !== items) {
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
      .forEach(x => {
        let cost = x.price * x.quantity
        let tax = cost * (res.totalRate / 100)
        taxes.set(x, tax)
      })
    break;
  }

  if (items.every(x => taxes.has(x))) {
    this.send('cart/taxes', Array.from(taxes.values()))
  }
}
