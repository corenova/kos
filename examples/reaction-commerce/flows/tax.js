// Reaction Tax Calculation Stream

const kos = require('kos')

module.exports = kos.create('reaction-tax')
  .summary('Provides reaction commerce tax calculation workflow')

  .in('cart/items').out('cart/items/taxable').bind(filterTaxableGoods)
  .in('cart/items/taxable','cart/items/taxes').out('cart/taxes').bind(calculateTaxes)

//-------------------
// Reactor Functions
//-------------------

function filterTaxableGoods(shippables) {
  let taxables = shippables.filter(x => x.taxable)
  this.send('cart/items/taxable', taxables)
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
function calculateTaxes(taxables, taxes) {
  let items = taxables
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
