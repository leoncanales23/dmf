// Server-side catalog: the browser only ever sends a productId. Amount, currency and description come
// from here. Klap charges in CLP. An amount of null would mean "not sold through Klap", and order
// creation refuses it.
//
// CLP prices are the USD list prices (workers/dmf-payments) at the commercial rate 1 USD ≈ 1.000 CLP,
// set in Chilean retail form (…990): USD × 1.000 − 10. Starter carries the launch price, USD 100 ≈ $99.990.
// The landing shows the same figures (KLAP_CLP in index.html); a test keeps the two in step.
export const USD_TO_CLP = 1000;
export const PRODUCTS = Object.freeze({
  starter: Object.freeze({ title: 'DMF Academy — Starter', amount: 99990, currency: 'CLP', usd: 100 }),
  pro: Object.freeze({ title: 'DMF Academy — Pro', amount: 496990, currency: 'CLP', usd: 497 }),
  elite: Object.freeze({ title: 'DMF Academy — Elite', amount: 996990, currency: 'CLP', usd: 997 }),
  addon: Object.freeze({ title: 'DMF Academy — Labels', amount: 79990, currency: 'CLP', usd: 80 })
});

export function resolveProduct(productId, catalog = PRODUCTS) {
  if (typeof productId !== 'string' || !Object.prototype.hasOwnProperty.call(catalog, productId)) {
    return { ok: false, error: 'unknown-product' };
  }
  const product = catalog[productId];
  if (!Number.isInteger(product.amount) || product.amount <= 0 || product.currency !== 'CLP') {
    return { ok: false, error: 'product-not-available' };
  }
  return { ok: true, productId, product };
}
