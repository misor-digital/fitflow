---
"fitflow": patch
---

Fix delivery cycle order cutoffs being saved and shown in the server's time zone

Cutoff times entered when creating a cycle were read in the server's time zone. In production (UTC) a cutoff of 14:00 was saved as 14:00 UTC, so orders stayed open until 16:00 (17:00 in summer) Bulgarian time and the customer banner showed that later time. Admin pages formatted cutoffs on the server too, so they showed UTC hours and hid the difference. Editing a cycle had the opposite mismatch.

Cutoffs are now always Bulgarian time. The create and update routes read the `datetime-local` value as Europe/Sofia wall time (summer and winter time included), and the edit form sends it unchanged. `formatCutoffAt` (admin cycle list and detail, account subscriptions), the cutoff banner and the edit form show Europe/Sofia time whatever the server or browser time zone. The Sofia time zone helpers moved from the Speedy module to a shared `lib/utils/sofia-time`. Existing cycles created in production may have cutoffs 2–3 hours late and should be checked and re-saved.
