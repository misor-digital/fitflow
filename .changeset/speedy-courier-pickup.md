---
"fitflow": minor
---

Add Speedy courier pickup from our address to the dispatch panel

Waybills are now created for courier pickup by default: the sender is only our Speedy contract client, so Speedy collects the parcels from its registered address instead of expecting a drop-off at an office. A new „Заяви куриер (N)“ action in `/admin/dispatch` loads the available pickup days from Speedy (`pickup/terms`), lets the admin pick a date, the latest visit time, contact and phone, and sends one `POST /pickup` for all eligible waybills in the cycle. Requests are stored in the new `speedy_pickup_requests` table, and orders are linked to them through an atomic claim, so a double submit cannot order two couriers. Once a waybill is in a pickup request it shows „🚚 Куриер заявен“ and can no longer be cancelled through the system. Waybills created for office drop-off show an „Офис“ tag, are skipped, and trigger a banner.

A new „Изпращане и куриер“ section in `/admin/settings/dispatch` sets the sender mode (pickup by default, office drop-off as a fallback), the drop-off office (moved here from the parcel settings), pickup contact, phone, latest visit time and an optional per-visit fee. The fee is informational only and does not change the delivery margin. The shipment routes save the sender mode on each order and accept an optional `pickupDate`. The bulk route now also reports orders whose DB update failed. `/calculate` now sends Speedy's calculation request shape (`serviceIds`, `addressLocation`) instead of reusing the shipment payload, and accepts `senderMode` to compare pickup and drop-off prices.

Requires migration `20261101120000_add_speedy_pickup_requests.sql`, which adds the table, three `orders` columns, marks existing waybills as `dropoff` and seeds the new `site_config` keys. `supabase/schema.sql` was synced with the earlier Speedy migrations and now includes these objects.
