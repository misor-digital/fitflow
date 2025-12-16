# Rollback

Rollback means restoring a **known good production state**.

This repo is designed to make rollback trivial.

---

## Primary rollback method (recommended)

### Vercel rollback
- Redeploy a previous production build
- No code changes required

Use this for:
- Immediate recovery
- Unknown root cause

---

## Git-based rollback

Because every production release is tagged:

1. Identify the last good version
2. Redeploy that tag
3. Investigate the regression separately

---

## What rollback does NOT do

- It does NOT revert database migrations
- It does NOT undo external side effects

Those require follow-up fixes.

---

## Best practices

- Always know what version is live
- Expose version info (footer or `/health`)
- Roll forward when possible, rollback when necessary

---

## Philosophy

> Rollback is a safety net, not a development strategy.
