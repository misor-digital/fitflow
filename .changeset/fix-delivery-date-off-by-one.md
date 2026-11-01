---
"fitflow": patch
---

Fix suggested delivery dates being one day early outside UTC

The create-cycle page and `/api/delivery/upcoming` turned calculated delivery dates into text with `toISOString()`, which converts local midnight to UTC first. On a server in Bulgarian time (for example local development) every suggested date was the day before the configured delivery day. Creating a cycle from a suggestion then saved that wrong date, and the „Зает“ check and the default cutoff were based on it. Dates are now formatted from their calendar parts.

„Today“ in cycle logic now means today in Bulgaria. That covers the upcoming-cycle queries, the current-cycle filter, the cycle status („след N дни“, past or upcoming) and the next-delivery calculation. Before, a UTC server still treated the time between 00:00 and 02:00/03:00 Bulgarian time as the previous day.
