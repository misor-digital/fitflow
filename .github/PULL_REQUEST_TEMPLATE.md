> 📘 Development workflow: docs/workflow.md  
> 📦 Releases: docs/releases.md  
> 🚑 Hotfixes: docs/hotfixes.md  
> ↩️ Rollback: docs/rollback.md  

---

## Linked Issue
Closes #

---

## Type of change
- [ ] Bug fix
- [ ] Feature
- [ ] Tech debt / Refactor
- [ ] Performance
- [ ] Docs

---

## Description
What changed and why?  
Focus on *impact*, not implementation details.

---

## Target branch checklist
- [ ] dev → feature work
- [ ] stage → release candidate
- [ ] main → production only

---

## Release intent
- [ ] This change affects production behavior
- [ ] This change does NOT require a release (docs / infra)

> If this is a Feature or Bug going to `main`, a **changeset is required**  
> unless `skip-release` is explicitly approved.

---

## Versioning
- [ ] This PR does NOT bump versions (required unless targeting main)
- [ ] This PR includes a changeset (if user-facing change)

---

## Validation
- [ ] Build passes
- [ ] Tested on Vercel preview (if applicable)
