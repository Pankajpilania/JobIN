# Discount Code Rules

This document defines the first release of public discount codes for JobIN subscriptions. Stripe is the source of truth for code validity, redemptions, and subscription discounts; JobIN will not keep a second discount ledger.

## Audience and scope

- A code is public: any customer can redeem it. It is not tied to a particular Stripe customer.
- Codes apply to the existing Premium and Pro plans, and to each configured currency and billing interval. There are no plan, currency, or first-time-customer restrictions in the first release.
- The discount is a percentage from 1% through 100%; fixed-amount discounts are out of scope.
- Stripe Checkout permits one promotion code per checkout. Discounts do not stack.

## Code timing

There are two separate time settings:

1. **Redemption window:** a code becomes usable immediately after creation. An optional “valid until” date ends new redemptions. Future start dates are out of scope for the first release.
2. **Subscription discount duration:** the admin chooses one invoice, a specified number of months, or the full subscription lifetime. The selected duration is applied by the Stripe coupon.

An optional global redemption limit applies across all customers. The first release does not promise a one-redemption-per-person limit. Deactivating a code prevents new redemptions; it does not remove a discount already applied to an existing subscription.

## Checkout and payment behavior

- Users enter codes on the existing Stripe-hosted Checkout page. The backend already enables Stripe promotion codes for checkout sessions.
- Stripe calculates the final amount, including any remaining balance and applicable tax. For discounts below 100%, the customer pays the amount due through Stripe Checkout.
- A 100% code makes the discounted subscription amount zero; it does not create a charge for that invoice. A 100% discount that lasts only one invoice or a limited number of months can be followed by paid renewals, so Stripe Checkout must still collect a payment method for those future renewals. Since customers enter codes after the API creates the hosted Checkout Session, the API cannot know the coupon duration in advance; it collects a payment method for subscription checkouts. The customer is not charged when the discounted amount due is zero.
- Subscription access is granted only after the existing Stripe webhook confirms the subscription. A zero-cost checkout must follow that same confirmation path.

## Validation and visibility

- Codes are normalized to uppercase before creation and shown to customers in their entered form.
- Reject percentages outside 1–100, invalid or past expiry dates, non-positive redemption limits, and repeating durations unsupported by Stripe.
- The admin list shows code, percentage, duration, expiry, uses/limit, and active/expired status. Only Finance Admins can create, view, or deactivate codes.
- Creation and deactivation are written to the existing admin audit log. Stripe errors are returned without exposing secret credentials.

## Stripe mapping

- Create a Stripe Coupon for percentage and subscription duration.
- Create a public Stripe Promotion Code for the customer-entered string, optional expiry, and optional global redemption limit.
- Use Stripe's promotion-code active state for deactivation and Stripe's redemption counts for usage reporting.
