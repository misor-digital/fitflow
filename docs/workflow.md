# Development Workflow

## Branches

| Branch | Purpose |
|------|--------|
| `dev` | Active development |
| `stage` | Pre-production validation |
| `main` | Production |

Only `main` creates versions.

---

## End-to-end flow

1. Create an issue (Feature / Bug / Docs)
2. Branch off `dev`
3. Open PR → `dev`
4. Merge to `dev`
5. Open PR `dev` → `stage`
6. Validate on staging
7. Add a changeset and run version bump on `stage`
8. Open PR `stage` → `main`
9. Merge → Git tag created automatically
10. **Dev branch synced automatically** (see below)

---

## Detailed steps

### 1. Issue
- Use an issue template
- Labels determine release behavior later

### 2. Development
- Branch from `dev`
- Commit freely
- Run lint and fix all problems before pushing - CI will fail otherwise
  ```bash
  pnpm lint
  ```

### 3. PR → `dev`
- CI runs
- Label required
- No versioning rules
- Use **squash and merge** for clean history

### 4. PR → `stage`
- CI runs again
- This is what gets tested
- No versions are created here
- Use **rebase and merge** for clean history

### 5. Version bump (manual on stage)

When ready to release, run on the `stage` branch:

```bash
# Create a changeset (if not already done)
pnpm changeset

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

### 6. PR → `main`
This is where **gates apply**:
- CI must pass
- PR must have a valid label
- Changeset required (unless `skip-release` label) or version already bumped
- Use **rebase and merge** for clean history

### 7. Merge to `main`
- Merge the PR
- The **Production Tag** workflow creates a Git tag (`vX.Y.Z`)
- The **Sync Version to Dev** workflow syncs the version to `dev`
- This is production

### 8. Automatic sync to dev

After merge to `main`, the **Sync Version to Dev** workflow automatically:
- Merges `main` into `dev` using fast-forward
- Keeps `dev` in sync with the latest version

**Note:** `stage` is already in sync because it was the source of the PR.

**Why this matters:**
- Keeps version numbers consistent across all branches
- Prevents history divergence and PR conflicts
- Future PRs will only show new changes, not historical mismatches

---

## Merge strategies

| PR Type | Strategy | Reason |
|---------|----------|--------|
| Feature → `dev` | Squash and merge | Clean, single commit per feature |
| `dev` → `stage` | Rebase and merge | Linear history for promotion |
| `stage` → `main` | Rebase and merge | Linear history for release |

---

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | PR to `dev`, `stage`, `main` | Lint, test, build |
| **Require Label** | PR opened/labeled/unlabeled/synchronize | Ensures PR has a valid label |
| **Require Changeset** | PR to `main` (opened/synchronize/labeled/unlabeled) | Blocks merge if no changeset and version not bumped (unless `skip-release`) |
| **Production Tag** | Push to `main` | Creates Git tag from `package.json` version |
| **Sync Version to Dev** | Push to `main` (when `package.json` or `CHANGELOG.md` changes) | Syncs version bump to `dev` branch |
| **Remove skip-release** | New commits on PR to `main` | Removes `skip-release` label to force re-confirmation |

---

## Guiding principle

> Nothing reaches production without intent,  
> and intent is documented in code.
