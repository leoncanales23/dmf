/* VibraAlto Immersive Commerce — payment router (reusable core).
 *
 * createCheckout(provider, productId, idToken) → { provider, purchaseId, paymentEnvironment, checkoutUrl, checkoutConfig }
 * The pages never see provider internals. The browser sends only a productId and the Firebase ID token;
 * amounts, currencies and credentials live in the provider Workers. Access is decided by the server
 * (check-status), never by this file or by URL parameters.
 *
 * Configuration: window.__DMF_COMMERCE__ (written at build time into academy-env.js). Defaults keep the
 * current production behaviour: Mercado Pago only.
 */
(function (root) {
  'use strict';

  var ENDPOINTS = {
    mercadopago: {
      production: 'https://dmf-payments.vibraalto-cl.workers.dev',
      sandbox: 'https://dmf-payments-sandbox.vibraalto-cl.workers.dev',
      create: '/create-preference'
    },
    klap: {
      production: 'https://dmf-klap-payments.vibraalto-cl.workers.dev',
      sandbox: 'https://dmf-klap-payments-sandbox.vibraalto-cl.workers.dev',
      create: '/create-order'
    }
  };
  var PROVIDERS = ['mercadopago', 'klap'];

  function httpsUrl(value) {
    return typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/.test(value) ? value.replace(/\/+$/, '') : '';
  }

  function readConfig(win) {
    var raw = (win && win.__DMF_COMMERCE__) || {};
    var p = raw.payments || {};
    var e = raw.effects || {};
    return {
      payments: {
        provider: p.provider === 'klap' ? 'klap' : 'mercadopago',
        fallbackProvider: p.fallbackProvider === 'none' ? null : 'mercadopago',
        klapEnabled: p.klapEnabled === true,
        klapFlexSdkUrl: httpsUrl(p.klapFlexSdkUrl),
        klapUrl: httpsUrl(p.klapUrl),
        mercadopagoUrl: httpsUrl(win && win.__DMF_PAYMENTS_URL__)
      },
      // audioReactive: signal-bus.js. The rest: Hyperdrive V2 channels (scripts/overdrive/hyperdrive-v2.js);
      // false restores that channel's pre-V2 behaviour. Quality stays with the adaptive governors.
      effects: {
        audioReactive: e.audioReactive !== false,
        reflections: e.reflections !== false,
        particles: e.particles !== false,
        cinematicCamera: e.cinematicCamera !== false,
        singularityFX: e.singularityFX !== false
      }
    };
  }

  function environmentFrom(search) {
    return /(^|[?&])payments=sandbox(&|$)/.test(search || '') ? 'sandbox' : 'production';
  }

  // Klap is used when the build enables it, or — for QA only — when ?provider=klap is combined with
  // ?payments=sandbox. A URL can never switch production to an unreleased provider.
  function selectProvider(cfg, search, environment) {
    var forced = /(^|[?&])provider=klap(&|$)/.test(search || '');
    if (forced && environment === 'sandbox') return 'klap';
    if (cfg.payments.provider === 'klap' && cfg.payments.klapEnabled) return 'klap';
    return 'mercadopago';
  }

  function endpoint(cfg, provider, environment) {
    var ep = ENDPOINTS[provider];
    if (environment === 'sandbox') return ep.sandbox;
    if (provider === 'klap') return cfg.payments.klapUrl || ep.production;
    return cfg.payments.mercadopagoUrl || ep.production;
  }

  function statusUrl(cfg, provider, environment, purchaseId) {
    var p = PROVIDERS.indexOf(provider) >= 0 ? provider : 'mercadopago';
    return endpoint(cfg, p, environment) + '/check-status?purchaseId=' + encodeURIComponent(purchaseId);
  }

  function fail(message, fallback) {
    var err = new Error(message);
    err.fallback = !!fallback;
    return err;
  }

  // Provider-specific responses → one shape.
  function normalizeResponse(provider, environment, data) {
    if (!data || data.ok !== true) throw fail((data && data.error) || 'checkout-failed', !!(data && data.fallback));
    if (provider === 'klap') {
      var cfgOut = data.checkoutConfig && data.checkoutConfig.orderId ? { provider: 'klap', orderId: String(data.checkoutConfig.orderId) } : null;
      var url = httpsUrl(data.checkoutUrl);
      if (!cfgOut && !url) throw fail('no-checkout', true);
      return { provider: 'klap', purchaseId: data.purchaseId, paymentEnvironment: data.paymentEnvironment || environment, checkoutUrl: url || null, checkoutConfig: cfgOut };
    }
    var initPoint = httpsUrl(data.init_point);
    if (!initPoint) throw fail('no-checkout', false);
    return { provider: 'mercadopago', purchaseId: data.purchaseId, paymentEnvironment: data.paymentEnvironment || environment, checkoutUrl: initPoint, checkoutConfig: null };
  }

  function createCheckout(provider, productId, idToken, opts) {
    opts = opts || {};
    var cfg = opts.config || readConfig(root);
    var environment = opts.environment || 'production';
    var doFetch = opts.fetch || (root.fetch && root.fetch.bind(root));
    if (PROVIDERS.indexOf(provider) < 0) return Promise.reject(fail('unknown-provider', false));
    return doFetch(endpoint(cfg, provider, environment) + ENDPOINTS[provider].create, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
      body: JSON.stringify({ productId: productId })
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'http-' + r.status, fallback: r.status >= 500 }; })
        .then(function (data) {
          if (!r.ok && data && data.fallback === undefined) data.fallback = r.status >= 500;
          return normalizeResponse(provider, environment, data);
        });
    }, function () {
      throw fail('network', true);
    });
  }

  function track(event, props) {
    if (typeof root.dmfTrack === 'function') root.dmfTrack(event, props);
  }

  // Full purchase: chosen provider, then (Klap only) the configured fallback when Klap cannot take the order.
  function checkout(productId, idToken, opts) {
    opts = opts || {};
    var cfg = opts.config || readConfig(root);
    var search = opts.search !== undefined ? opts.search : ((root.location && root.location.search) || '');
    var environment = opts.environment || environmentFrom(search);
    var provider = opts.provider || selectProvider(cfg, search, environment);
    var run = function (p) {
      track('checkout_provider', { provider: p, product: productId, environment: environment });
      return createCheckout(p, productId, idToken, { config: cfg, environment: environment, fetch: opts.fetch });
    };
    track('checkout_started', { provider: provider, product: productId, environment: environment });
    return run(provider).catch(function (err) {
      if (provider === 'klap' && err.fallback && cfg.payments.fallbackProvider === 'mercadopago') {
        if (root.console) root.console.log('[VIBRA PAYMENTS] klap unavailable, falling back to mercadopago (' + err.message + ')');
        track('checkout_failed', { provider: 'klap', reason: err.message, fallback: true });
        return run('mercadopago');
      }
      track('checkout_failed', { provider: provider, reason: err.message, fallback: false });
      throw err;
    });
  }

  function loadScript(src, doc) {
    return new Promise(function (resolve, reject) {
      var s = doc.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(fail('sdk-load-failed', false)); };
      doc.head.appendChild(s);
    });
  }

  // Klap Checkout Flex opens in place (modal) when its SDK is configured; otherwise, and for Mercado Pago,
  // the visitor goes to the provider's hosted checkout.
  function launch(result, opts) {
    opts = opts || {};
    var cfg = opts.config || readConfig(root);
    var nav = opts.navigate || function (url) { root.location.href = url; };
    var redirect = function () {
      if (!result.checkoutUrl) throw fail('no-checkout', false);
      nav(result.checkoutUrl);
      return 'redirect';
    };
    if (result.provider === 'klap' && result.checkoutConfig && cfg.payments.klapFlexSdkUrl && root.document) {
      return loadScript(cfg.payments.klapFlexSdkUrl, root.document).then(function () {
        var flex = root.KLAP_FLEX;
        if (!flex || typeof flex.init !== 'function') return redirect();
        flex.init({ order_id: result.checkoutConfig.orderId });
        return 'flex';
      }, redirect);
    }
    return Promise.resolve().then(redirect);
  }

  var api = {
    readConfig: readConfig,
    environmentFrom: environmentFrom,
    selectProvider: selectProvider,
    endpoint: endpoint,
    statusUrl: statusUrl,
    normalizeResponse: normalizeResponse,
    createCheckout: createCheckout,
    checkout: checkout,
    launch: launch,
    PROVIDERS: PROVIDERS
  };
  root.DMFCommerce = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
