'use strict'

// Create the namespace
Object.defineProperty(NGN, 'DATA', NGN.public({}))

// Define the Model and entity
const Record = require('./shared/data/model')
Object.defineProperties(NGN.DATA, {
  Entity: NGN.privateconst(Record.Entity),
  Model: NGN.const(Record.Model)
})

// Decorate the data namespace with utilities, stores, and the proxy.
require('./shared/data/utility')
require('./shared/data/store')
require('./shared/data/proxy')
require('./shared/data/httpproxy')
