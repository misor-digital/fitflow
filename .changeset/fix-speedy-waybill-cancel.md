---
"fitflow": patch
---

Fix Speedy waybill cancellation and add bulk cancel to the dispatch panel

Cancelling a waybill from `/admin/dispatch` always failed. The request sent `parcels: [{ id }]` with the first parcel id, but Speedy's `shipment/cancel` expects `shipmentId` (the waybill number) and a required `comment`. The error mapping also matched English phrases, while Speedy answers in Bulgarian, so admins saw raw or generic errors. Cancellation now sends `{ shipmentId, comment }`, the Speedy client parses the structured error (`message`, `code`, `id`, `component`) for HTTP errors too, and Speedy messages are mapped to clear Bulgarian texts, including the „заявена за взимане“ case.

The `window.confirm` prompt is replaced by a modal with an editable reason (default „Анулирана от администратор“, up to 1024 characters). The dispatch table has a checkbox column and an „Анулирай избраните“ toolbar that cancels several waybills in one go through the new `POST /api/admin/speedy/shipment/cancel/bulk` route, followed by a summary of cancelled and failed waybills. The Cancel button and checkbox only show for waybills that can still be cancelled (not delivered, returned, in transit, at an office or already cancelled). Single and bulk cancel share one helper, so validation, DB cleanup and logging stay the same.
