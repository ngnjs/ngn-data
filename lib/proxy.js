'use strict'

/**
 * @class NGN.DATA.Proxy
 * Provides a gateway to remote services such as HTTP and
 * websocket endpoints. This can be used directly to create
 * custom proxies. However; NGN.DATA.HttpProxy and NGN.DATA.WebSocketProxy
 * are also available for use.
 */
class Proxy extends NGN.Class {
  constructor (cfg) {
    cfg = cfg || {}

    if (!cfg.store) {
      throw new Error('NGN.DATA.Proxy requires a NGN.DATA.Store.')
    }

    super(cfg)
    cfg.store.proxy = this

    Object.defineProperties(this, {
      /**
       * @cfgproperty {NGN.DATA.Store} store (required)
       * THe store for data being proxied.
       */
      store: NGN.define(true, false, false, cfg.store),

      /**
       * @cfgproperty {string} [url=http://localhost
       * The root URL for making network requests (HTTP/WS/TLS).
       */
      url: NGN.define(true, true, false, cfg.url || 'http://localhost'),

      /**
       * @cfg {string} username
       * If using basic authentication, provide this as the username.
       */
      username: NGN.define(true, true, false, cfg.username || null),

      /**
       * @cfg {string} password
       * If using basic authentication, provide this as the password.
       */
      password: NGN.define(true, true, false, cfg.password || null),

      /**
       * @cfg {string} token
       * If using an access token, provide this as the value. This
       * will override basic authentication (#username and #password
       * are ignored). This sets an `Authorization: Bearer <token>`
       * HTTP header.
       */
      token: NGN.define(true, true, false, cfg.token || null)
    })
  }

  /**
   * @property actions
   * A list of the record changes that have occurred.
   * @returns {object}
   * An object is returned with 3 keys representative of the
   * action taken:
   *
   * ```js
   * {
   *   create: [NGN.DATA.Model, NGN.DATA.Model],
   *   update: [NGN.DATA.Model],
   *   delete: []
   * }
   * ```
   *
   * The object above indicates two records have been created
   * while one record was modified and no records were deleted.
   * **NOTICE:** If you add or load a JSON object to the store
   * (as opposed to adding an instance of NGN.DATA.Model), the
   * raw object will be returned. It is also impossible for the
   * data store/proxy to determine if these have changed since
   * the NGN.DATA.Model is responsible for tracking changes to
   * data objects.
   * @private
   */
  get actions () {
    let me = this
    return {
      create: this.store._created,
      update: this.store.records.filter(function (record) {
        if (me.store._created.indexOf(record) < 0 && me.store._deleted.indexOf(record) < 0) {
          return false
        }
        return record.modified
      }).map(function (record) {
        return record
      }),
      delete: this.store._deleted
    }
  }

  save () {
    console.warn('save() not implemented.')
  }

  fetch () {
    console.warn('fetch() not implemented.')
  }
}

module.exports = Proxy
