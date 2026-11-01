---
"fitflow": patch
---

Handle Speedy waybills that were cancelled directly in the Speedy portal

A waybill cancelled in myspeedy.bg stayed attached to its order. „Анулирай“ failed because Speedy refuses to cancel a waybill twice. Tracking then marked the order „canceled“ but kept the waybill number, which hid the cancel button and blocked creating a new waybill, so the order was stuck. Now, when Speedy refuses a cancellation, the panel checks the waybill's tracking status. If Speedy reports it as cancelled, our data is cleared and the admin sees „Товарителницата вече е анулирана в Speedy — данните са изчистени.“ The tracking cron and the customer tracking page clear cancelled waybills the same way, including any courier-request link, and fix orders already stuck in that state. Those orders return to „Чака“ so a new waybill can be created.

The dispatch panel also shows an error banner when its orders fail to load, for example when a database migration is missing, instead of „Няма поръчки за този цикъл“.
