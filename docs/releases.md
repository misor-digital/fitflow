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

## Changeset Decision Table

Use this table to decide whether a change requires a changeset.

| Change type | Example | User-facing | Package / API change | Versioned artifact | Changeset required |
|------------|---------|-------------|----------------------|--------------------|--------------------|
| UI text change | Copy update, disclaimer text | Yes | No | No | No |
| UI layout / styling | Button order, spacing, colors | Yes | No | No | No |
| Currency display order | EUR shown before BGN | Yes | No | No | No |
| Feature inside app | New checkout step, new banner | Yes | No | No | No |
| Bug fix in app logic | Fix wrong price shown | Yes | No | No | No |
| Internal refactor | Deduplicate logic, move code | No | No | No | No |
| Config / content change | Legal text, footer links | Yes | No | No | No |
| API contract change | Change response shape | Maybe | Yes | Maybe | Yes |
| Shared library change | Change exported util | Maybe | Yes | Yes | Yes |
| Breaking change | Remove / rename export | Yes / Maybe | Yes | Yes | Yes |
| New published package | New `@fitflow/*` package | No | Yes | Yes | Yes |
| Dependency version bump | Public package bump | No | Yes | Yes | Yes |


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

## After a release: Sync branches

After each production release, the version bump must be synced back to `stage` and `dev`:

```bash
# Sync stage with main
git checkout stage
git pull origin stage
git merge origin/main --no-edit
git push origin stage

# Sync dev with stage
git checkout dev
git pull origin dev
git merge origin/stage --no-edit
git push origin dev
```

**This ensures:**
- All branches have the same version number
- Git histories stay aligned
- Future PRs only show new changes (no history conflicts)

See [workflow.md](./workflow.md) for the complete flow.

---

## Philosophy

> Releases are **cheap but meaningful**.  
> No version is created accidentally.
