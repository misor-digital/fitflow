---
"fitflow": patch
---

Consolidate all date/time formatting into a shared `lib/utils/date.ts` module with 6 canonical functions. Removes 18 duplicated local helpers across ~25 files. Fixes raw ISO timestamps rendering on admin subscription pages, 2-digit year in email log table, and inconsistent bare-locale date formats. Admin order/subscription dates now show both date and time.
