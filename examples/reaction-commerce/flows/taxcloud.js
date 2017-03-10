// TaxCloud Tax Rate Stream

const { kos = require('kos') } = global

// TaxCloud service subflow (should be defined as a separate flow module)
const TaxCloud = kos.create('service-taxcloud')
  .import(kos.load('http'))
  .require('taxcloud/access/id','taxcloud/access/key','taxcloud/access/url')
  .default('taxcloud/access/url', 'https://api.taxcloud.net/1.0/TaxCloud/Lookup')
  .default('requests', new Map)

  .in('taxcloud/request').out('http/request/post').bind(invokeRequest)
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
module.exports = kos.create('reaction-taxcloud')
  .import(TaxCloud)
  .require('taxcloud/access/id','taxcloud/access/key')
  .in('reaction/shipping/address').out('taxcloud/address').bind(normalizeAddress)
  .in('cart/items/taxable').out('taxcloud/items').bind(normalizeCartItems)

  .in('taxcloud/items','taxcloud/address','reaction/customer/id')
  .out('taxcloud/request')
  .bind(invokeTaxCloud)

  .in('taxcloud/items','taxcloud/response/items')
  .out('cart/items/tax')
  .default('taxes', new Map)
  .bind(calculateTaxes)
  
function normalizeAddress(addr) {
  this.send('taxcloud/address', {
    Address1: addr.address1,
    City:     addr.city,
    State:    addr.region,
    Zip5:     addr.postal
  })
}

function normalizeCartItems(items) {
  this.send('taxcloud/items', items.map((x, idx) => ({
    Index: idx,
    ItemID: x.id,
    TIC: 11010,
    Price: x.price,
    Qty: x.quantity
  })))
}

function invokeTaxCloud(items, destination, customer) {
  // need to handle different origins on a per item basis
  this.send('taxcloud/request', {
    customerID: customer,
    cartID: 'foo-bar',
    destination: destination,
    origin: destination,
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
  let [ url, login, key ] = this.fetch('taxcloud/access/url', 'taxcloud/access/id', 'taxcloud/access/key')
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

