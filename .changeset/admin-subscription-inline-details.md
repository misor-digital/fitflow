---
"fitflow": minor
---

Add inline „Детайли“ panel to the admin subscriptions list

Each row in `/admin/subscriptions` now has a „▼ Детайли“ button, like the orders list. It opens the subscription's core data inline: user, status, frequency, price, promo code, start date, delivery address with phone, and personalization. The panel looks the same as the detail page. Only one row is open at a time. The button has `aria-expanded`/`aria-controls`, and „Виж →“ still opens the full page.

`getSubscriptionsPaginated` now also loads each subscription's default address in one batch query, checking that the address belongs to the subscriber. Profiles, emails and addresses are loaded in parallel, so the panel opens without extra requests. The detail page's info grid and personalization tags moved into shared `SubscriptionSummaryParts` components, with no visual change to the detail page.
