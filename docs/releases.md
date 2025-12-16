# Releases

This project uses **Changesets** for production versioning.

Versions are created **only on `main`**.

---

## When a release happens

A release happens automatically when:
- A PR is merged into `main`
- AND a changeset is present (unless explicitly skipped)

---

## Versioning rules

| Change | Version |
|-----|--------|
| Bug fix | Patch |
| Feature | Minor |
| Breaking change | Major |

The exact bump is chosen when creating the changeset.

---

## How to add a changeset

From your branch:

```bash
pnpm changeset
```

- Select patch / minor / major
- Write a short, user-facing description
- Commit the generated file

---

## Skipping a release

You may skip a release when:
- The change is docs-only
- The change does not affect runtime behavior

To do this:
- Apply the `skip-release` label
- At least one approval is required

Pushing new commits will remove `skip-release`, forcing re-confirmation.

---

## Release artifacts

Each release creates:
- A version bump commit
- A Git tag (`vX.Y.Z`)
- A traceable production state

---

## Philosophy

> Releases are **cheap but meaningful**.  
> No version is created accidentally.
