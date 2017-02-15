// Avalara Tax Rates service flow

const kos = require('kos')

module.exports = kos.flow
  .label('reaction-avalara')
  .require('module/avalara-taxrates','avalara/access/key')
  .in('avalara/request/address').out('avalara/response').bind(calculateTaxRates)

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
    else {
      res.address = addr // save the address for which the response belongs
      this.send('avalara/response', res)
    }
  })
}
