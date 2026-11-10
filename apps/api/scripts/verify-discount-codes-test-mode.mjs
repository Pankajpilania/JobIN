import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key?.startsWith('sk_test_')) {
  throw new Error('Refusing to run: STRIPE_SECRET_KEY must be a Stripe test-mode key (sk_test_...).');
}

const stripe = new Stripe(key);
const created = { product: null, price: null, coupons: [], promotionCodes: [], sessions: [] };
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const product = await stripe.products.create({ name: 'JobIN temporary discount verification' });
  created.product = product.id;
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'gbp',
    unit_amount: 10_000,
    recurring: { interval: 'month' },
  });
  created.price = price.id;

  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const cases = [
    { code: `JOBIN100-${Date.now()}`, percent: 100, duration: 'once' },
    { code: `JOBIN25-${Date.now()}`, percent: 25, duration: 'once' },
  ];
  for (const item of cases) {
    const coupon = await stripe.coupons.create({
      name: item.code,
      percent_off: item.percent,
      duration: item.duration,
    });
    created.coupons.push(coupon.id);
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: item.code,
      max_redemptions: 2,
      expires_at: expiry,
    });
    created.promotionCodes.push(promo.id);
    assert(promo.active && promo.customer === null, `${item.code} is not active and global.`);
    assert(promo.max_redemptions === 2, `${item.code} redemption limit was not retained.`);
    assert(promo.expires_at === expiry, `${item.code} expiry was not retained.`);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: 'discount-check@example.invalid',
      success_url: 'https://example.invalid/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.invalid/cancel',
      payment_method_collection: 'always',
      discounts: [{ promotion_code: promo.id }],
    });
    created.sessions.push(session.id);
    assert(session.payment_method_collection === 'always', 'Checkout did not collect a payment method.');
    const expectedTotal = item.percent === 100 ? 0 : 7500;
    assert(session.amount_total === expectedTotal,
      `${item.code} total was ${session.amount_total}; expected ${expectedTotal} pence.`);
    console.log(`${item.percent}% code ${item.code}: Checkout total £${(session.amount_total / 100).toFixed(2)}; payment method ${session.payment_method_collection}.`);
  }

  const [fullCoupon, partialCoupon] = created.coupons;
  const renewableCoupon = await stripe.coupons.create({
    name: 'JobIN finite 100 percent renewal check', percent_off: 100, duration: 'repeating', duration_in_months: 3,
  });
  created.coupons.push(renewableCoupon.id);
  const futureRenewalPromo = await stripe.promotionCodes.create({
    coupon: renewableCoupon.id,
    code: `JOBINRENEW-${Date.now()}`,
    max_redemptions: 1,
    expires_at: expiry,
  });
  created.promotionCodes.push(futureRenewalPromo.id);
  assert(renewableCoupon.duration_in_months === 3, 'Repeating coupon duration was not retained.');
  assert(fullCoupon && partialCoupon, 'Expected both checkout scenarios to be created.');
  console.log('Global scope, expiry, redemption caps, and finite renewal duration verified.');

  await stripe.promotionCodes.update(created.promotionCodes[1], { active: false });
  const inactive = await stripe.promotionCodes.retrieve(created.promotionCodes[1]);
  assert(!inactive.active, 'Deactivation did not make the code inactive.');
  console.log('Deactivation verified.');
} catch (error) {
  const reason = error?.type === 'StripeAuthenticationError'
    ? 'Stripe rejected the configured test key. Replace it with a valid sk_test_ key.'
    : error instanceof Error ? error.message : 'Unknown Stripe test-mode error.';
  throw new Error(`Discount-code verification failed: ${reason}`);
} finally {
  for (const id of created.sessions) {
    try { await stripe.checkout.sessions.expire(id); } catch { /* Closed sessions need no cleanup. */ }
  }
  for (const id of created.promotionCodes) {
    try { await stripe.promotionCodes.update(id, { active: false }); } catch { /* Continue cleanup. */ }
  }
  for (const id of created.coupons) {
    try { await stripe.coupons.del(id); } catch { /* Coupons referenced by completed sessions cannot be deleted. */ }
  }
  if (created.price) {
    try { await stripe.prices.update(created.price, { active: false }); } catch { /* Continue cleanup. */ }
  }
  if (created.product) {
    try { await stripe.products.del(created.product); } catch { /* Continue cleanup. */ }
  }
}
