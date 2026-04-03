---
"fitflow": minor
---

Refactor Meta Pixel event hierarchy and add server-side CAPI for Purchase and Subscribe

- Promote `Purchase` to primary conversion event on order completion; demote `Lead` to mid-funnel intent signal at Step 3
- Fire `InitiateCheckout` when the order form mounts (Step 1)
- Add server-side `Purchase` CAPI event in `/api/order` and custom `Subscribe` CAPI event in `/api/subscription` (Graph API v21.0)
- Extract reusable `buildCapiUserData` helper for PII hashing across API routes
- Deduplicate browser ↔ CAPI events via `capiEventId` passed through the order store to the thank-you page
- Include `data_processing_options` on all CAPI events for GDPR compliance
- Handle consent downgrade at runtime: revoke Meta Pixel consent, clear tracking cookies, and prompt page refresh
- Skip analytics script rendering and CAPI calls in non-production environments
- Update `meta-capi-setup.md` and `gdpr-cookie-consent.md` documentation
