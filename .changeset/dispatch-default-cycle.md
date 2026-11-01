---
"fitflow": patch
---

Preselect the nearest upcoming delivery cycle in the dispatch panel

The „Доставки“ panel opened on the first entry of the cycle dropdown, which is sorted newest first, so it showed the furthest-future cycle instead of the one being shipped next. It now preselects the nearest upcoming cycle, falling back to the most recently delivered one, the same default as the admin orders page. Other cycles can still be chosen from the dropdown.
