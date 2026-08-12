---
"fitflow": patch
---

Show prices in EUR only and remove the dual EUR/BGN currency display across the app.

Customer- and admin-facing prices (order flow, order tracking, account orders & subscriptions, admin orders & subscriptions, campaign previews, and all transactional emails) now display a single Euro price instead of `X € / Y лв`. The client-side EUR→BGN conversion helpers, the cached `EUR_TO_BGN_RATE` lookup, and the BGN fields on price/display types have been removed. This is a display-only change: prices are already stored in EUR, so no data migration is required. The database price RPC, the `EUR_TO_BGN_RATE` site config value, and Speedy's internal BGN→EUR conversion (the courier API returns BGN) are intentionally left untouched.
