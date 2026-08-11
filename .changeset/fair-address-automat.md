---
"fitflow": patch
---

Fix Speedy automat addresses not being handled in the admin address routes and centralize all address create/update logic in a shared `lib/order/address-write` module

Staff creating or editing a delivery address on behalf of a customer can now correctly save Speedy automat (parcel locker) addresses; previously the admin address endpoints only recognized Speedy office and treated automat selections as an incomplete street address, causing validation errors or wrong data. Sanitization, validation, delivery-method branching, and DB payload building are now shared across the customer and admin address routes, so all delivery methods stay consistent and cannot drift out of sync again.
