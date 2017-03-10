// Reaction Tax Calculation Stream

const { kos = require('kos') } = global

module.exports = kos.create('reaction-tax')
  .summary('Provides reaction commerce tax calculation workflow')

  .in('cart/items').out('cart/items/taxable').bind(filterTaxableGoods)
  .in('cart/items/taxable','cart/items/tax').out('cart/tax').bind(calculateOverallTax)

//-------------------
// Reactor Functions
//-------------------

function filterTaxableGoods(shippables) {
  let taxables = shippables.filter(x => x.taxable)
  this.send('cart/items/taxable', taxables)
}

// calculateOverallTax - this routine gets called every time one of
// expected responses are received. we need to make a decision based
// on whichever tax calculation services send along sufficient
// response(s) in order to formulate the overall cart tax calculation.
function calculateOverallTax(taxables, taxes) {
  let mapping = new Map
  taxes.forEach(x => mapping.set(x.id, x.tax))
  if (taxables.every(x => mapping.has(x.id))) {
    let totalTax = 0
    for (let tax of mapping.values())
      totalTax += tax
    this.send('cart/tax', totalTax)
  }
}
