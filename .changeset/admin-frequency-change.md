---
"fitflow": minor
---

Add subscription frequency change to admin subscription detail page

- Add `adminUpdateSubscriptionFrequency` data-layer function (skips ownership check, logs history with `changed_by: admin`)
- Add `update_frequency` action to `PATCH /api/admin/subscription/[id]` with validation and Brevo contact sync
- Add teal "⏱ Промени честота" button and frequency picker modal to `SubscriptionDetailView` (active subscriptions only)
