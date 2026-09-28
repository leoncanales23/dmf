/* VibraAlto Immersive Commerce — funnel analytics (reusable core).
 *
 * dmfTrack(event, props) emits a `dmf:analytics` DOM event and, when a tag manager is present, pushes to
 * window.dataLayer. No vendor is loaded here. Only whitelisted, non-personal properties are forwarded:
 * never emails, uids, tokens, order ids or payment data.
 */
(function (root) {
  'use strict';

  var EVENTS = [
    'landing_view', 'hero_interaction', 'audio_enabled', '3d_loaded', 'academy_view', 'pricing_view',
    'cta_click', 'checkout_started', 'checkout_provider', 'checkout_failed', 'payment_approved',
    'payment_rejected', 'payment_pending', 'conversion_complete'
  ];
  var PROPS = ['product', 'provider', 'environment', 'placement', 'status', 'lang', 'tier', 'reason', 'fallback'];
  var once = {};

  function sanitize(props) {
    var out = {};
    if (!props) return out;
    for (var i = 0; i < PROPS.length; i++) {
      var k = PROPS[i];
      var v = props[k];
      if (v === undefined || v === null) continue;
      if (typeof v === 'boolean' || typeof v === 'number') out[k] = v;
      else out[k] = String(v).replace(/[^\w.:-]/g, '').slice(0, 40);
    }
    return out;
  }

  function track(event, props, opts) {
    if (EVENTS.indexOf(event) < 0) return false;
    if (opts && opts.once) {
      if (once[event]) return false;
      once[event] = true;
    }
    var detail = sanitize(props);
    detail.event = event;
    try {
      if (root.dataLayer && typeof root.dataLayer.push === 'function') root.dataLayer.push(detail);
    } catch (e) { /* analytics must never break the page */ }
    try {
      if (typeof root.CustomEvent === 'function' && root.document) {
        root.document.dispatchEvent(new root.CustomEvent('dmf:analytics', { detail: detail }));
      }
    } catch (e) { /* ignore */ }
    try {
      if (root.console && /[?&]debug-analytics(=|&|$)/.test((root.location && root.location.search) || '')) {
        root.console.log('[VIBRA LANDING] ' + event, JSON.stringify(detail));
      }
    } catch (e) { /* ignore */ }
    return true;
  }

  // Declarative hooks: [data-track="cta_click"] + [data-track-placement="hero"] on any element,
  // and one-shot section views for [data-track-view="academy_view"].
  function bind(doc) {
    if (!doc || bind.done) return;
    bind.done = true;
    doc.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
      if (!el) return;
      track(el.getAttribute('data-track'), {
        placement: el.getAttribute('data-track-placement'),
        product: el.getAttribute('data-product')
      });
    }, { passive: true, capture: true });
    var views = doc.querySelectorAll('[data-track-view]');
    if (!views.length || typeof root.IntersectionObserver !== 'function') return;
    var io = new root.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) continue;
        track(entries[i].target.getAttribute('data-track-view'), null, { once: true });
        io.unobserve(entries[i].target);
      }
    }, { threshold: 0.35 });
    for (var j = 0; j < views.length; j++) io.observe(views[j]);
  }

  var api = { track: track, sanitize: sanitize, bind: bind, EVENTS: EVENTS };
  root.DMFAnalytics = api;
  root.dmfTrack = track;
  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', function () { bind(root.document); });
    else bind(root.document);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
