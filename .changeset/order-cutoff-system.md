---
"fitflow": minor
---

Add `order_cutoff_at` to delivery cycles with configurable per-cycle ordering deadlines. Replace all customer-facing `getUpcomingCycle()` calls with cutoff-aware `getUpcomingCycles()` filtering to prevent orders and subscriptions from being assigned to cycles whose cutoff has passed. Add sliding countdown banner and floating popup widget on homepage and order page with admin toggles. Show delivery cycle name in order steps, confirmation emails, subscription emails, and order tracking page. Add inline edit mode for cycle details, orphaned order/subscription detection with backfill, and admin delivery settings for widget controls.
