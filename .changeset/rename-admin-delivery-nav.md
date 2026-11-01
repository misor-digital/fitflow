---
"fitflow": patch
---

Rename the admin menu items for delivery cycles and Speedy dispatch

The two menu items had near-identical names, which made it easy to open the wrong page. „Доставки“ (`/admin/delivery`, planning delivery cycles) is now „Цикли“, and „Изпращане“ (`/admin/dispatch`, Speedy waybills, labels, courier pickup and tracking) is now „Доставки“. In settings, „Доставки“ is now „Цикли и цени“ and „Изпращане (Speedy)“ is now „Доставки (Speedy)“. Page headings, browser tab titles and the admin docs use the new names. The Speedy page now has its own browser tab title, and the „Първи стъпки“ and „Роли и права“ docs now list it. URLs, routes and access rights are unchanged.
