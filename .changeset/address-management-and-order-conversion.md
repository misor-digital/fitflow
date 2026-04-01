---
"fitflow": minor
---

Address management, order-to-subscription conversion, and subscription delivery fixes

- Add customer address CRUD page with home delivery and Speedy office support
- Add admin address API and customer detail page with addresses, subscriptions, and orders
- Add subscription address change via picker modal with history logging
- Add Speedy office fields to addresses table and API routes
- Add multi-step order-to-subscription conversion flow with guest auto-account creation via magic link
- Add admin campaign page to filter eligible orders, preview recipients, and bulk-send conversion emails
- Track conversion campaign send status and converted order count
- Send post-conversion confirmation email and sync contact to Brevo
- Extend subscription API with conversionToken, guest auto-account, onBehalfOfUserId, and campaign promo support
- Add DB migrations for Speedy office address fields and order-subscription conversion tracking
- Fix Speedy office address validation failure on subscription orders
- Use per-subscription next delivery date instead of shared upcoming cycle
- Archive preorder campaign from sidebar navigation
- Normalize email templates to informal language with feminine forms
