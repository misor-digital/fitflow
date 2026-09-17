---
"fitflow": patch
---

Auto-detect LAN IPs for `allowedDevOrigins` so network dev access survives DHCP changes

The dev server's `allowedDevOrigins` previously relied on a hardcoded list of LAN IPs. When DHCP reassigned the machine's address, the list went stale and Next.js blocked `/_next/*` for network access, breaking Fast Refresh and causing full-page reloads that wiped form input. `next.config.ts` now derives the allowed origins from the machine's non-internal IPv4 addresses at startup, so network development keeps working without manual edits. Production is unaffected.
