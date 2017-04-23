'use strict'

/**
 * @class NGN.DATA.ConnectionPool
 * The connection pool is a global dictionary of live database connections.
 * It is available for server use only, designed to support server-side
 * NGN.DATA.Proxy classes.
 *
 * For example, an API platform may utilize individual NGN.DATA.Model instances
 * to perform data validation and persistence.
 *
 * ```js
 * const BlogPost = new NGN.DATA.Model({
 *   fields: {
 *     title: String,
 *     article: String
 *   },
 *
 *   proxy: new NGNX.DATA.MongoDBProxy(...)
 * })
 *
 * app.post('/blog', (req, res) => {
 *   let data = new BlogPost(req.body)
 *
 *   if (!data.valid) {
 *     return res.status(400).send(`Invalid or missing data fields: ${data.invalidDataAttributes.join(', ')}`)
 *   }
 *
 *   data.save(() => res.sendStatus(201))
 * })
 * ```
 *
 * In the express-style `POST /blog` endpoint above, a new MongoDB connection
 * would be created for every new blog post. _Without connection pooling_, this
 * is wasteful and potentially impacts performance on high-traffic systems.
 *
 * Connection pooling is handled by the proxy classes (NGNX.DATA.MongoDBProxy in
 * this example). Instead of recreating a new connection for each new request,
 * the connection pool helps the proxy reuse existing connections instead of
 * constantly connecting/disconnecting for each request. This reduces system
 * churn and network load.
 *
 * @singleton
 * @private
 * @fires connection.created
 * Triggered when a new connection is available. An object with `id` and
 * `connection` attributes is passed to handlers.
 * @fires connection.deleted
 * Triggered when a connection is no longer available. An object with `id` and
 * `connection` attributes is passed to handlers.
 * @fires connection.drained
 * Triggered when a connection no longer has any registered clients. The `id`
 * of the connection is passed as a {string} argument to the handler.
 * @fires connection.used
 * Triggered when a connection is requested by any client. The `id` of the
 * connection is passed as a {string} argument to the handler.
 * @fires client.connected
 * Triggered when a client starts using the connection.
 * @fires client.connected
 * Triggered when a client starts using the connection.
 * @fires client.disconnected
 * Triggered when a client stops using a connection.
 */
class ConnectionPool extends NGN.EventEmitter {
  constructor () {
    super()

    Object.defineProperties(this, {
      clients: NGN.private({}),
      destroyOnDrain: NGN.private(true)
    })

    NGN.createException({
      name: 'DatabaseConnectionError',
      type: 'DatabaseConnectionError',
      message: 'An error occured with a pooled connection.'
    })

    this.on('connection.drained', (id) => {
      if (this.destroyOnDrain) {
        this.remove(id)
      }
    })
  }

  /**
   * @property {Object} connections
   * The complete key/value store of active connections. Each key represents
   * a unique connection fingerprint, while each value is the live connection.
   */
  get connections () {
    return this.connectionpool
  }

  /**
   * @property {Boolean} deleteOnEmpty
   * When set to `true` (the default), connections will automatically be removed
   * when all clients have disconnected (via #unregisterClient).
   */
  get deleteOnEmpty () {
    return this.destroyOnDrain
  }

  set deleteOnEmpty (value) {
    this.destroyOnDrain = value
  }

  /**
   * @method add
   * Add a new live connection. If the connection is an event EventEmitter
   * capable of emitting a `disconnect` event, it will be automatically
   * removed when the connection is no longer active.
   * @param {string} key
   * The unique ID of the connection. This is usually the fingerprint
   * generated by the proxy.
   * @param {Object} connection
   * The live connection object.
   * @param {Boolean} [overwrite=false]
   * When set to `true`, attempting to add a key that already exists
   * (using a different connection) will succeed.
   */
  add (key, value, overwrite = false) {
    let triggerEvent = true

    if (this.connectionpool.hasOwnProperty(key)) {
      if (value === this.connectionpool[key]) {
        return
      } else if (!overwrite) {
        throw new DatabaseConnectionError(`A different connection for ${key} already exists.`)
      } else {
        triggerEvent = false
      }
    }

    // Add the connection.
    Object.defineProperty(this, key, {
      get: () => {
        this.emit('connection.used', key)
        return value
      }
    })

    // Apply automatic removal when possible.
    if (typeof value === 'object' && value.hasOwnProperty('on')) {
      value.on('disconnect', () => {
        this.remove(key)
      })
    }

    // Notify any event handlers
    if (triggerEvent) {
      this.emit('connection.created', {
        id: key,
        connection: value
      })
    }
  }

  /**
   * @method remove
   * Remove a live connection. **Note:** If the connection is an
   * event emitter
   * @param  {string} id
   * The connection ID to remove.
   */
  remove (key) {
    if (!this.connectionpool.hasOwnProperty(key)) {
      return NGN.BUS.emit('NGN.ADVISORY.WARN', `NGN.DATA.ConnectionPool cannot remove '${key}' because it cannot be found.`)
    }

    let old = {
      id: key,
      connection: this[key]
    }

    delete this[key]

    if (this.clients.hasOwnProperty(key)) {
      delete this.clients[key]
    }

    this.emit('connection.deleted', old)
    old = null // Faster garbage collection
  }

  /**
   * @method registerClient
   * Register a known client using a specific connection.
   * @param {string} id
   * The ID of the pooled connection the client is registering itself with.
   * @param {string} [name]
   * An optional descriptive name/ID to recognize the client with.
   * If no name is provided, a unique ID is automatically generated.
   * @returns {string}
   * Returns the name.
   */
  registerClient (key, name = null) {
    this.clients[key] = NGN.coalesce(this.clients[key], {})

    let id = NGN.coalesce(name, NGN.DATA.util.GUID())
    this.clients[key][id] = NGN.coalesce(this.clients[key][id], 0)
    this.clients[key][id]++

    return id
  }

  /**
   * @method unregisterClient
   * Unregister a known client for a specific connection.
   * @param {string} id
   * The ID of the pooled connection the client is registered to.
   * @param {string} name
   * The descriptive name/ID to recognize the client with.
   * If this was provided during the registration process, it must be
   * provided here as well.
   */
  unregisterClient (key, name) {
    try {
      this.clients[key][name]--
      if (this.clients[key][name] === 0) {
        delete this.clients[key][name]
        this.emit('client.disconnected', {
          connection: this[key],
          connectionId: key,
          id: name
        })
      }

      if (Object.keys(this.clients[key]).length === 0) {
        delete this.clients[key]
        this.emit('connection.drained', key)
      }
    } catch (e) {}
  }

  /**
   * @method activeConnections
   * Retrieve the number of active connections.
   * @param {string} [connection_id]
   * If provided, the sum will only reflect connections to the specified
   * connection pool.
   * @returns {Number}
   */
  activeConnections (id = null) {
    let count = 0

    if (id !== null) {
      if (!this.clients.hasOwnProperty(id)) {
        return 0
      }

      Object.keys(this.clients[id]).forEach((client) => {
        count += this.clients[id][client]
      })
    } else {
      Object.keys(this.clients).forEach((connection) => {
        Object.keys(this.clients[connection]).forEach((client) => {
          count += this.clients[connection][client]
        })
      })
    }

    return count
  }
}

NGN.DATA.ConnectionPool = ConnectionPool
