# Releases

This project uses **Changesets** for production versioning.

Versions are created **only on `main`**.

---

## When a release happens

A release happens when:
1. A PR targeting `main` has the `release` label applied
2. The **Version bump** workflow runs and commits the version change to the PR branch
3. The PR is merged into `main`
4. The **Production Tag** workflow creates a Git tag for the new version

---

## Release workflow

### Step 1: Add a changeset (during development)

From your branch:

```bash
pnpm changeset
```

- Select patch / minor / major
- Write a short, user-facing description
- Commit the generated file

### Step 2: Apply the `release` label

When your PR is ready for production (targeting `main`):
- Apply the `release` label to the PR
- This triggers the **Version bump** workflow

### Step 3: Version bump (automated)

The workflow will:
- Run `pnpm changeset version`
- Commit the version bump directly to your PR branch
- The commit message will be: `chore(release): bump version to X.Y.Z`

### Step 4: Merge to main

After the version bump commit is pushed:
- Review and merge the PR
- The **Production Tag** workflow creates a Git tag (`vX.Y.Z`)

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
- Apply the `skip-release` label to the PR
- At least one approval is required

**Note:** Pushing new commits will automatically remove the `skip-release` label, forcing re-confirmation.

---

## Release artifacts

Each release creates:
- A version bump commit (on the PR branch, before merge)
- A Git tag (`vX.Y.Z`) after merge to `main`
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

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **Version bump** | PR to `main` with `release` label | Runs `changeset version` and commits the bump |
| **Production Tag** | Push to `main` | Creates Git tag from `package.json` version |
| **Require Changeset** | PR to `main` | Blocks merge if no changeset (unless `skip-release`) |
| **Remove skip-release** | New commits on PR to `main` | Removes `skip-release` label to force re-confirmation |

---

## Philosophy

> Releases are **cheap but meaningful**.  
> No version is created accidentally.
