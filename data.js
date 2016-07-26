'use strict'

// Create the namespace
NGN.DATA = {}

// Define the Model and entity
const Record = require('./shared/data/model')
Object.defineProperties(NGN.DATA, {
  Entity: NGN.privateconst(Record.Entity),
  Model: NGN.const(Record.Model)
})

// Decorate the data namespace with utilities, stores, and the proxy.
require('./shared/data/utility')
try {
  require('./shared/data/store')
} catch (e) {
  console.log(e)
}
require('./shared/data/proxy')
