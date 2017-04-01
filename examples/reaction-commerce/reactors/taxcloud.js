// TaxCloud Tax Rate Stream

const { kos = require('kos') } = global
const httpReactor = require('kos/reactors/http')

// TaxCloud service subflow (should be defined as a separate flow module)
const TaxCloud = kos.reactor('service-taxcloud')
  .load(httpReactor)
  .init('taxcloud/access/url', 'https://api.taxcloud.net/1.0/TaxCloud/Lookup')
  .init('requests', new Map)

  .in('taxcloud/request')
  .has('taxcloud/access/id','taxcloud/access/key','taxcloud/access/url')
  .out('http/request/post')
  .bind(invokeRequest)

  .in('http/response').out('taxcloud/response').bind(handleResponse)

  .in('taxcloud/response').out('taxcloud/response/items')
  .bind(function extractItems(data) {
    this.send('taxcloud/response/items', data.CartItemsResponse)
  })

  .in('taxcloud/response/items').out('taxcloud/response/total')
  .bind(function calculateTotalTax(items) {
    let totalTax = items.reduce(((total, item) => {
      total += item.TaxAmount
    }), 0)
    this.send('taxcloud/response/total', totalTax)
  })

// Reaction Commerce TaxCloud flow
module.exports = kos.reactor('reaction-taxcloud')
  .load(TaxCloud)

  .in('reaction/shipping/address').out('taxcloud/destination').bind(normalizeDestination)
  .in('cart/items/taxable').out('taxcloud/items').bind(normalizeCartItems)

  .in('taxcloud/items','taxcloud/destination','reaction/customer/id')
  .out('taxcloud/request')
  .bind(invokeTaxCloud)

  .in('taxcloud/items','taxcloud/response/items')
  .out('cart/items/tax')
  .init('taxes', new Map)
  .bind(calculateTaxes)
  
function normalizeAddress(addr) {
  return {
    Address1: addr.address1,
    City:     addr.city,
    State:    addr.region,
    Zip5:     addr.postal
  }
}

function normalizeDestination(addr) {
  this.send('taxcloud/destination', normalizeAddress(addr))
}

function normalizeCartItems(items) {
  this.debug(items)
  this.send('taxcloud/items', items.map((x, idx) => ({
    Index: idx,
    ItemID: x.id,
    TIC: '00000',
    Price: x.price,
    Qty: x.quantity,
    Origin: normalizeAddress(x.origin)
  })))
}

function invokeTaxCloud(items, destination, customer) {
  // need to handle different origins on a per item basis
  let origin = items[0].Origin
  
  this.send('taxcloud/request', {
    customerID: customer,
    cartID: 'foo-bar',
    destination: destination,
    origin: origin,
    cartItems: items
  })
}

function calculateTaxes(items, results) {
  let map = this.get('taxes')
  this.debug(results)
  results.forEach(x => map.set(x.CartItemIndex, x.TaxAmount))
  if (items.every(x => map.has(x.Index))) {
    let taxes = items.map(x => ({ 
      id:  x.ItemID, 
      tax: map.get(x.Index)
    }))
    this.send('cart/items/tax', taxes)
    map.clear() // clear the mapping table
  }
}

// Reactors for taxcloud native flow

function invokeRequest(req) {
  let [ url, login, key ] = this.get('taxcloud/access/url', 'taxcloud/access/id', 'taxcloud/access/key')
  this.debug(req)
  this.send('http/request/post', {
    url: url,
    data: Object.assign({}, req, {
      apiKey: key,
      apiLoginID: login,
      deliveredBySender: false
    })
  })
}

function handleResponse(res) {
  let data = res.body
  if (data.ResponseType === 3) {
    this.send('taxcloud/response', data)
  } else this.throw(data.Messages[0].Message)
}

