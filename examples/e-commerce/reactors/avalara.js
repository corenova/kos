// Avalara Tax Rate Stream

const { kos = require('kos') } = global

module.exports = kos.create('reaction-avalara')
  .in('avalara/request/address').and.has('module/avalara-taxrates','avalara/access/key')
  .out('avalara/response').bind(calculateTaxRates)

function calculateTaxRates(addr) {
  let [ Avalara, apiKey ] = this.pull('module/avalara-taxrates', 'avalara/access/key')
  let address = [ addr.address1,
                  addr.city,
                  addr.region,
                  addr.country,
                  addr.postal ]
  this.log('triggering tax calaculation')
  Avalara.taxByAddress(apiKey, ...address, res => {
    if (res.error) this.throw(res.error)
    else this.send('avalara/response', res)
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

