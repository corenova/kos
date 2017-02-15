// TaxCloud Tax Rate service flow

const kos = require('kos')

module.exports = kos.flow
  .label('taxcloud')
  .require('flow/http')
  .require('taxcloud/access/id','taxcloud/access/key','taxcloud/access/url')
  .default('taxcloud/access/url', 'https://api.taxcloud.net/1.0/TaxCloud/Lookup')
  .default('requests', new Map)

  .in('taxcloud/request').out('http/request/post').bind(invokeRequest)
  .in('http/response/body').out('taxcloud/response').bind(handleResponse)

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

function invokeRequest(req) {
  this.send('http/request/post', {
    url: this.pull('taxcloud/access/url'),
    data: Object.assign({}, req, {
      apiKey: this.pull('taxcloud/access/key'),
      apiLoginID: this.pull('taxcloud/access/id'),
      deliveredBySender: false
    })
  })
}

function handleResponse(data) {
  if (data.ResponseType === 3) {
    this.send('taxcloud/response', data)
  } else this.throw(data.Messages[0].Message)
}

