# Hotfixes

Hotfixes are production fixes that must ship quickly.

They still follow the workflow, with minimal deviation.

---

## When to use a hotfix

- Production bug
- User-blocking issue
- Revenue-impacting failure

---

## Hotfix flow

1. Branch from `main`
   ```bash
   git checkout main
   git pull
   git checkout -b hotfix/short-description
   ```
   
2. Apply the fix
3. Add a changeset (usually patch)
4. Open PR → `main`
5. Apply the `release` label to trigger version bump
6. Merge after approval

---

## Why not bypass the process?

Even hotfixes:
- Create a version
- Create a tag
- Preserve rollback ability

Speed comes from automation, not skipping steps.

---

## After the hotfix

- Merge `main` back into `stage` and `dev`
- Ensure future work includes the fix

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

---

## Rule of thumb
> Fast fixes are safe fixes only if they are traceable.
