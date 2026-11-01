---
"fitflow": minor
---

Make the default order cutoff for new delivery cycles configurable

The create-cycle form used to pre-fill the order cutoff with a hardcoded „2 days before delivery at 14:00“. „Настройки → Цикли и цени“ now has „Краен срок за поръчки (по подразбиране за нови цикли)“, with days before delivery (0–14, default 2) and a time (default 14:00, Bulgarian time). The create-cycle form pre-fills the cutoff from these values and its hint shows them. The cutoff can still be changed per cycle, and existing cycles are not affected. The settings preview now also shows the default cutoff for the next delivery. It uses the same next-delivery calculation as the server instead of a separate copy.

Requires migration `20261101130000_add_order_cutoff_default_keys.sql`, which adds the `ORDER_CUTOFF_DAYS_BEFORE` and `ORDER_CUTOFF_TIME` site_config rows. Until it runs, the defaults (2 days, 14:00) are used.
