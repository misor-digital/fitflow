---
"fitflow": patch
---

Show all dates and times in Bulgarian time across the app

The shared formatters in `lib/utils/date.ts` (`formatDateShort`, `formatDateTimeShort`, `formatDateCompact`, `formatDateLong`, `formatDateTimeLong`) used the time zone of wherever they ran. Pages rendered on the server and transactional emails therefore showed UTC times in production. Examples: order, subscription, customer, campaign and feedback timestamps in admin, and order history and tracking for customers. Times were 2–3 hours behind, and dates were a day off between midnight and 02:00/03:00. The formatters now always use Europe/Sofia, so the server, emails and browsers in any time zone show the same wall-clock time.

The promo code form's start and end fields are now read and filled in as Bulgarian time instead of the browser's time zone, like the delivery cycle cutoff. The cycle dropdown on the admin orders page also formats in Europe/Sofia.
