---
"fitflow": minor
---

Add cycle-based promo code tracking for subscriptions

- Add `default_max_cycles` column to `promo_codes` table (1 = first order only, NULL = unlimited)
- Add `promo_max_cycles` and `promo_cycles_used` columns to `subscriptions` table with CHECK constraints
- Backfill existing subscriptions: count promo-applied orders and clear exhausted promos
- Add `default_max_cycles` field to promo code create/edit form and API with validation
- Copy `default_max_cycles` from promo code to subscription at creation time
- Check promo cycle eligibility during order generation (batch and single-subscription paths)
- Automatically clear promo and reset price to base when cycles are exhausted
- Add admin subscription promo management UI: apply new promo, update max cycles, or clear promo
- Add `update_promo` action to admin subscription PATCH API with `apply`, `update_cycles`, and `clear` sub-actions
- Display active subscription count on promo code edit/stats page
