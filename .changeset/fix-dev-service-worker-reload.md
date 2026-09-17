---
"fitflow": patch
---

Register the service worker only in production to stop constant page reloads in local development

The root layout previously registered `/sw.js` in every environment. In development its passthrough `fetch` handler intercepted Next.js Fast Refresh/HMR traffic, forcing full-page reloads that wiped in-progress form input. The service worker now registers only when `NODE_ENV === 'production'`, so dev keeps Fast Refresh's in-place updates. Production PWA behavior is unchanged.
