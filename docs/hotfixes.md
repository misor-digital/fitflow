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
5. Merge after approval

---

## Why not bypass the process?

Even hotfixes:
- Create a version
- Create a tag
- Preserve rollback ability

Speed comes from automation, not skipping steps.

---

## After the hotfix

- Merge `main` back into `dev`
- Ensure future work includes the fix

---

## Rule of thumb
> Fast fixes are safe fixes only if they are traceable.
