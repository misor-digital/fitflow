# Releases

This project uses **Changesets** for production versioning.

Versions are created **only on `main`**.

---

## When a release happens

A release happens when:
1. A changeset is created and version bump is run on `stage`
2. A PR from `stage` to `main` is merged
3. The **Production Tag** workflow creates a Git tag for the new version
4. The **Sync Version to Dev** workflow syncs the version to `dev`

---

## Release workflow

### Step 1: Add a changeset (during development)

From your branch or on `stage`:

```bash
pnpm changeset
```

- Select patch / minor / major
- Write a short, user-facing description
- Commit the generated file

### Step 2: Version bump (on stage)

When ready to release, run on the `stage` branch:

```bash
# Apply the version bump
pnpm changeset version

# Commit the changes
git add -A
git commit -m "chore(release): bump version to X.Y.Z"
git push origin stage
```

This updates:
- `package.json` with the new version
- `CHANGELOG.md` with release notes
- Deletes consumed changeset files

### Step 3: Create PR to main

Open a PR from `stage` to `main`:
- CI must pass
- PR must have a valid label
- The **Require Changeset** workflow will pass (version already bumped)

### Step 4: Merge to main

After merging the PR:
- The **Production Tag** workflow creates a Git tag (`vX.Y.Z`)
- The **Sync Version to Dev** workflow syncs the version to `dev`

---

## Versioning rules

| Change | Version |
|-----|--------|
| Bug fix | Patch |
| Feature | Minor |
| Breaking change | Major |

The exact bump is chosen when creating the changeset.

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
- Apply the `skip-release` label to the PR targeting `main`
- The **Require Changeset** workflow will pass

**Note:** Pushing new commits will automatically remove the `skip-release` label, forcing re-confirmation.

---

## Release artifacts

Each release creates:
- A version bump commit (on `stage`, before PR to `main`)
- A Git tag (`vX.Y.Z`) after merge to `main`
- A traceable production state

---

## Automatic sync to dev

After each production release, the **Sync Version to Dev** workflow automatically:
- Merges `main` into `dev` using fast-forward (`--ff-only`)
- Keeps `dev` in sync with the latest version

**Note:** `stage` is already in sync because it was the source of the PR.

**This ensures:**
- All branches have the same version number
- Git histories stay aligned
- Future PRs only show new changes (no history conflicts)

See [workflow.md](./workflow.md) for the complete flow.

---

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Production Tag** | Push to `main` | Creates Git tag from `package.json` version |
| **Sync Version to Dev** | Push to `main` (when `package.json` or `CHANGELOG.md` changes) | Syncs version bump to `dev` branch |
| **Require Changeset** | PR to `main` (opened/synchronize/labeled/unlabeled) | Blocks merge if no changeset and version not bumped (unless `skip-release`) |
| **Remove skip-release** | New commits on PR to `main` | Removes `skip-release` label to force re-confirmation |

---

## Philosophy

> Releases are **cheap but meaningful**.  
> No version is created accidentally.
