// Server-side catalog: the browser only ever sends a productId. Amount, currency and description come
// from here. Klap charges in CLP; an amount of null means the product is not sold through Klap yet
// (the commercial CLP price has not been decided), and order creation refuses it.
export const PRODUCTS = Object.freeze({
  starter: Object.freeze({ title: 'DMF Academy — Starter', amount: null, currency: 'CLP' }),
  pro: Object.freeze({ title: 'DMF Academy — Pro', amount: null, currency: 'CLP' }),
  elite: Object.freeze({ title: 'DMF Academy — Elite', amount: null, currency: 'CLP' }),
  addon: Object.freeze({ title: 'DMF Academy — Labels', amount: null, currency: 'CLP' })
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
