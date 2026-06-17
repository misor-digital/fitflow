---
"fitflow": patch
---

Fix Speedy waybill creation to include COD, declared value, dropoff office, and correct parcel defaults

Waybills generated via the Speedy API were missing cash-on-delivery, declared value, and sender dropoff office fields. Parcel weight, contents, and packaging also did not match actual shipment data. All values are now sent correctly and are configurable through the admin Dispatch settings page via `site_config`.
