'use strict'

const cart = require('./reactors/cart')
const discount = require('./reactors/discount')
const shipping = require('./reactors/shipping')
const checkout = require('./reactors/checkout')
const tax = require('./reactors/tax')
const taxcloud = require('./reactors/taxcloud')

module.exports = { cart, discount, shipping, checkout, tax, taxcloud }
