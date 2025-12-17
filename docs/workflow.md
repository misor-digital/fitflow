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

### 4. PR → `stage`
- CI runs again
- This is what gets tested
- No versions are created here

### 5. PR → `main`
This is where **gates apply**:
- CI must pass
- PR must have a valid label
- Feature/Bug → changeset required
- `skip-release` allowed only with approval

### 6. Merge to `main`
- Version is bumped using **Changesets**
- Git tag is created
- This is production

---

## Guiding principle

> Nothing reaches production without intent,  
> and intent is documented in code.
