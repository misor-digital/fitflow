---
"fitflow": patch
---

Fix empty personalization options on transient Supabase errors and add retry resilience to all cached data queries

- Fix `getAllOptions()` returning `[]` on Supabase errors — empty result was cached by `unstable_cache` for 5 min, trapping users at order step 2 with no sport/flavor/dietary options
- Add `withRetry()` helper with exponential backoff (3 attempts, 500–1500ms jitter) for transient errors (timeouts, network failures, PostgREST 5xx)
- Apply `withRetry` to all 12 `unstable_cache`-wrapped read functions across `catalog.ts`, `delivery-cycles.ts`, `customers.ts`, and `subscriptions.ts`
- Fix `getUpcomingCycle`, `getUpcomingCycles`, `getCurrentRevealedCycle` silently returning null/[] on error (same cached-failure pattern)
- Fix `getSubscriptionsCount` and `getSubscriptionMRR` caching zeros on error for 60s
- Fix `getSiteConfig` silently returning null on DB errors without logging (now distinguishes "key not found" from "DB unreachable")
- Fix `getStaffCount` and `getCustomersStats` caching stale zeros on transient failures
- Add empty-state fallback UI in `OrderStepPersonalize` so users see a message and can proceed if options are unavailable
