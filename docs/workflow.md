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
7. (If needed) add a changeset
8. Open PR `stage` → `main`
9. Apply `release` label → version bump is committed to PR
10. Merge → Git tag created automatically
11. **Sync branches** (see below)

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

### 5. PR → `main`
This is where **gates apply**:
- CI must pass
- PR must have a valid label
- Changeset required (unless `skip-release` label)
- Apply `release` label to trigger version bump
- Use **rebase and merge** for clean history

### 6. Version bump (automated)
When the `release` label is applied:
- The **Version bump** workflow runs
- Executes `pnpm changeset version`
- Commits the version bump to your PR branch
- Commit message: `chore(release): bump version to X.Y.Z`

### 7. Merge to `main`
- After version bump commit is pushed, merge the PR
- The **Production Tag** workflow creates a Git tag (`vX.Y.Z`)
- This is production

### 8. Sync branches back

After each production release, sync the version bump back to lower branches:

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

**Why this matters:**
- Keeps version numbers consistent across all branches
- Prevents history divergence and PR conflicts
- Future PRs will only show new changes, not historical mismatches

---

## Merge strategies

| PR Type | Strategy | Reason |
|---------|----------|--------|
| Feature → `dev` | Squash and merge | Clean, single commit per feature |
| `dev` → `stage` | Merge commit | Preserve history for promotion |
| `stage` → `main` | Merge commit | Preserve history for release |
| `main` → `stage` (sync) | Merge commit | Bring version bump downstream |
| `stage` → `dev` (sync) | Merge commit | Keep branches aligned |

---

## GitHub Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | PR to `dev`, `stage`, `main` | Lint, test, build |
| **Require Label** | PR opened/labeled | Ensures PR has a valid label |
| **Require Changeset** | PR to `main` | Blocks merge if no changeset (unless `skip-release`) |
| **Version bump** | PR to `main` with `release` label | Commits version bump to PR branch |
| **Production Tag** | Push to `main` | Creates Git tag from `package.json` version |
| **Remove skip-release** | New commits on PR to `main` | Removes `skip-release` label to force re-confirmation |

---

## Guiding principle

> Nothing reaches production without intent,  
> and intent is documented in code.
