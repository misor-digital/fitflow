---
"fitflow": minor
---

Fix analytics event placement, add GA4 purchase event, and improve Meta CAPI coverage

- Add GA4 `purchase` event (`trackGAPurchase`) — enables revenue reporting in Google Analytics
- Move `ViewContent` from page-load on 3 pages to order funnel Step 1 with CAPI mirror
- Move `InitiateCheckout` from Step 1 to Step 3 (checkout details) with `begin_checkout` + CAPI mirror
- Remove stale `trackLead` and `trackGenerateLead` calls from the order flow
- Add `trackFormSubmit` on thank-you page for GA4 form completion tracking
- Create `POST /api/analytics/track` route for client-side CAPI event forwarding (PageView, ViewContent, InitiateCheckout)
- Add CAPI PageView mirror alongside Facebook Pixel init in ConditionalScripts
- Add `content_type: 'product'` to all Meta Purchase/Subscribe events (Pixel + CAPI)
- Add `coupon` param, `item_brand: 'FitFlow'`, `item_list_id`/`item_list_name` to GA4 ecommerce events
- Consolidate `funnel_step_${name}` into single `funnel_step` event with `step_name` parameter
- Add `userId` → hashed `external_id` support and `Subscribe` type to CAPI infrastructure
- Create `useScrollDepth` hook and wire to homepage, mystery box, and revealed box pages
- Wire `trackSubscriptionPaused` and `trackSubscriptionCancelled` in account modals
- Create `lib/analytics/cookies.ts` for `_fbp`/`_fbc` extraction
