'use strict'

const Record = require('./shared/data/model')

Object.defineProperties(NGN.DATA, {
//   util: NGN.const(require('./lib/utility')),
  Entity: NGN.privateconst(Record.Entity),
//   Model: NGN.const(Record.Model),
//   Proxy: NGN.const(require('./lib/proxy')),
//   Store: NGN.const(require('./lib/store'))
})

NGN.DATA = DATA
