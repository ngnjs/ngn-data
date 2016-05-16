'use strict'

const Record = require('./lib/model')

let DATA = {}
Object.defineProperties(DATA, {
  util: NGN.define(true, false, false, require('./lib/utility')),
  Entity: NGN.define(false, false, false, Record.Entity),
  Model: NGN.define(true, false, false, Record.Model),
  Proxy: NGN.define(true, false, false, require('./lib/proxy')),
  Store: NGN.define(true, false, false, require('./lib/store'))
})

NGN.DATA = DATA
