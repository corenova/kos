// TaxCloud Tax Rate Stream

const kos = require('kos')

// TaxCloud service subflow (should be defined as a separate flow module)
const TaxCloud = kos.create('taxcloud')
  .import('kos-http')
  .require('taxcloud/access/id','taxcloud/access/key','taxcloud/access/url')
  .default('taxcloud/access/url', 'https://api.taxcloud.net/1.0/TaxCloud/Lookup')
  .default('requests', new Map)

  .in('taxcloud/request').out('http/request/post').bind(invokeRequest)
  .in('http/response').out('taxcloud/response').bind(handleResponse)

  .in('taxcloud/response').out('taxcloud/response/items')
  .bind(function extractItems(data) {
    // need to map request -> response

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

  .in('taxcloud/items','taxcloud/address').out('taxcloud/request').bind(invokeTaxCloud)
  .in('taxcloud/response/items').out('cart/taxes').bind(calculateTaxes)
  
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
    TIC: "00000",
    Price: x.price,
    Qty: x.quantity
  })))
}

function invokeTaxCloud(items, destination) {
  // we need to find common origin/destination pairs and issue one or more taxcloud/request(s)
  // let origins = new Map
  // for (const item of items) {
  //   let destinations = origins.get(item.origin)
  //   if (origins.has(item.origin)) {
  //     destinations = origins.get(item.origin)
  //     destinations.set(item.destination)
  //   } else {
  //     let destinations = new Map
  //     destinations.set(item.destination, item)
  //     origins.set(item.origin, destinations)
  //   }
  // }
  this.send('taxcloud/request', {
    cartID: 'foo-bar',
    destination: destination,
    origin: destination,
    cartItems: items
  })
}

function calculateTaxes() {

}
