# Testing GitHub Actions Workflows

This document describes **how to safely test GitHub Actions workflows** in this repository
**without breaking branch protection rules or rewriting history**.

These rules apply to **all CI, release, and tagging workflows**.

---

## Core Rule

> **Production branches must never be modified or rewritten for testing purposes.**

This includes:
- disabling branch rules or rulesets
- force-pushing protected branches
- pushing commits directly to `main`

If a workflow cannot be tested with protections enabled, the workflow is considered incorrect.

---

## Approved Testing Methods

### 1. Temporary Test Branch (Recommended)

Use a temporary branch that behaves like production.

#### Steps

```bash
git checkout -b main-test
git push origin main-test
```

- Apply the same branch rules as `main`
- Temporarily update workflows to include `main-test`
- Open PRs targeting `main-test`
- Observe workflow behavior

#### Cleanup

After testing:
- delete `main-test`
- revert workflow triggers if needed

This method provides a **full rehearsal** with zero production risk.

---

### 2. Full Dry-Run Through Normal Flow

Test workflows using the real branch flow:

```
feature → dev → stage → main
```

- Open PRs normally
- Add labels (`release`, `skip-release`, etc.) as required
- Verify:
  - CI checks
  - enforcement workflows
  - tagging behavior after merge

This validates the **actual production path**.

---

### 3. Manual Workflow Dispatch

For workflows that support it:

- Use `workflow_dispatch`
- Run the workflow on a non-production branch
- Inspect logs and outputs

This is useful for:
- tag logic
- environment setup
- dependency installation

---

## Explicitly Forbidden Testing Methods

❌ Disabling branch protection or rulesets  
❌ Force-pushing `main`  
❌ Rewriting commit history  
❌ Testing by bypassing safeguards  
❌ Using admin or personal credentials to push from CI  

These actions undermine repository integrity and invalidate test results.

---

## Interpreting Test Results

A workflow is considered **correct** only if:

- it passes with branch rules enabled
- it does not require special permissions
- it does not push to protected branches
- failures are explicit and informative

If a test requires relaxing protections, the workflow must be redesigned.

---

## Troubleshooting Failures

When a workflow fails:

1. Read the **first failing step**
2. Check whether the failure is due to:
   - branch rules
   - missing permissions
   - incorrect trigger conditions
3. Adjust the workflow, **not the rules**

Never “fix” a workflow failure by weakening protections.

---

## Guiding Principle

> **Test workflows in the same conditions they run in production.**

Consistency is more important than convenience.

---

## Summary

- Testing must never modify protected history
- Branch rules stay enabled at all times
- Temporary branches are the safest test environment
- Production confidence comes from realism, not shortcuts
