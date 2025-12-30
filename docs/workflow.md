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
9. Merge → version + tag created automatically
10. **Sync branches** (see below)

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
- Feature/Bug → changeset required
- `skip-release` allowed only with approval
- Use **rebase and merge** for clean history

### 6. Merge to `main`
- Version is bumped using **Changesets**
- Git tag is created
- This is production

### 7. Sync branches back

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

## Guiding principle

> Nothing reaches production without intent,  
> and intent is documented in code.
