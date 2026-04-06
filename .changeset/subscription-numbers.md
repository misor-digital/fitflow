---
"fitflow": minor
---

Add human-readable subscription numbers and subscription change email notifications

- Add `subscription_number` column (`FF-SUB-DDMMYY-XXXXXX`) with DB migration, generator function, and backfill for existing rows
- Display subscription number in customer subscription card, admin detail view, admin table, and admin customer page
- Add subscription number to all existing email templates (created, paused, resumed, cancelled, delivery upcoming, conversion)
- Add new email templates and notification senders for frequency change, address change, and preferences update
- Wire change notification emails into user and admin subscription API routes (fire-and-forget)
- Add subscription number search support in admin subscriptions table
- Pass `delivery_method` from address to order insert during subscription order generation
- Update `SubscriptionRow` type with `subscription_number` field
- Update `schema.sql` with column definition, unique constraint, index, and generator function
